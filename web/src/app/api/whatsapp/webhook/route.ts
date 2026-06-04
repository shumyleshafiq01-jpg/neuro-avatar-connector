/**
 * /api/whatsapp/webhook — Meta sends WhatsApp events here.
 *
 * GET  → webhook verification handshake (one-time, when you configure the URL in Meta).
 * POST → incoming events (messages, statuses, etc.). We respond 200 *immediately*
 *        and process the message in the background — Meta retries aggressively
 *        if you take more than 5 seconds, so async-then-acknowledge is the pattern.
 *
 * Env:
 *   WHATSAPP_VERIFY_TOKEN     — random string you make up, must match what you
 *                               type into Meta's webhook config screen.
 *   WHATSAPP_PHONE_NUMBER_ID  — from Meta WhatsApp app
 *   WHATSAPP_ACCESS_TOKEN     — bearer token from Meta
 */

import { callNeuroBrain, type Msg } from "@/lib/neuroBrain";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { appendHistory, getHistory } from "@/lib/conversations";

// ---- GET: webhook verification ----
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!expected) {
    console.warn("[whatsapp] WHATSAPP_VERIFY_TOKEN not set");
    return new Response("Server not configured", { status: 500 });
  }

  if (mode === "subscribe" && token === expected && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// ---- POST: incoming events ----

type WhatsAppMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
};

type WhatsAppWebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      value?: {
        messages?: WhatsAppMessage[];
        // other fields (statuses, contacts, metadata) ignored for now
      };
      field?: string;
    }>;
  }>;
};

export async function POST(request: Request) {
  let body: WhatsAppWebhookPayload;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Acknowledge immediately so Meta doesn't retry. Then process in background.
  // (Vercel and Next.js dev both let async work continue after the response.)
  processWebhook(body).catch((err) => {
    console.error("[whatsapp] processWebhook error:", err);
  });

  return Response.json({ received: true });
}

async function processWebhook(body: WhatsAppWebhookPayload) {
  const entries = body.entry ?? [];
  for (const entry of entries) {
    const changes = entry.changes ?? [];
    for (const change of changes) {
      const messages = change.value?.messages ?? [];
      for (const message of messages) {
        if (message.type !== "text" || !message.text?.body) {
          // For now we only handle plain text. Media (images, audio,
          // documents) gets a polite acknowledgement.
          if (message.from) {
            await sendWhatsAppText(
              message.from,
              "I can only read text messages for now — please type your question."
            );
          }
          continue;
        }
        await handleTextMessage(message.from, message.text.body);
      }
    }
  }
}

async function handleTextMessage(from: string, text: string) {
  console.log(`[whatsapp] ← ${from}: ${text}`);
  const history = getHistory(from);
  const userMsg: Msg = { role: "user", content: text };
  const messages = [...history, userMsg];

  let replyText: string;
  let actions: ReturnType<typeof callNeuroBrain> extends Promise<infer R>
    ? R extends { actions: infer A }
      ? A
      : never
    : never;
  try {
    const result = await callNeuroBrain(messages, {
      channel: "whatsapp",
      callerPhone: from,
    });
    replyText = result.reply;
    actions = result.actions;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[whatsapp] brain error:", msg);
    replyText =
      "I'm having a brief connection problem. Please try again in a moment.";
    actions = [];
  }

  // WhatsApp doesn't run the [OPEN_URL:...] frontend action — append the
  // URL inline so the user gets a tappable preview link instead.
  let outgoing = replyText;
  for (const a of actions) {
    if (a.type === "open_url") {
      outgoing += `\n${a.url}`;
    }
  }

  // Save BOTH turns to per-user history so Neuro has context next time.
  appendHistory(from, userMsg, { role: "assistant", content: replyText });

  console.log(`[whatsapp] → ${from}: ${outgoing.slice(0, 80)}…`);
  const send = await sendWhatsAppText(from, outgoing);
  if (!send.ok) {
    console.error("[whatsapp] send failed:", send.reason);
  }
}
