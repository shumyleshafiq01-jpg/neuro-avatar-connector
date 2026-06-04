/**
 * WhatsApp Cloud API send utility.
 *
 * Posts a text message to a user via Meta's Graph API. Used by the
 * /api/whatsapp/webhook route after Neuro generates a reply.
 *
 * Required env:
 *   WHATSAPP_PHONE_NUMBER_ID   — from Meta Business → WhatsApp app
 *   WHATSAPP_ACCESS_TOKEN      — long-lived bearer token (or system-user token)
 *
 * Optional env:
 *   WHATSAPP_GRAPH_VERSION     — Graph API version, default v22.0
 */

const DEFAULT_GRAPH_VERSION = "v22.0";

export type WhatsAppSendResult =
  | { ok: true; messageId: string }
  | { ok: false; reason: string };

export async function sendWhatsAppText(
  to: string,
  text: string
): Promise<WhatsAppSendResult> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const version = process.env.WHATSAPP_GRAPH_VERSION || DEFAULT_GRAPH_VERSION;

  if (!phoneId || !token) {
    return {
      ok: false,
      reason:
        "WhatsApp credentials missing. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env.local.",
    };
  }

  const url = `https://graph.facebook.com/${version}/${phoneId}/messages`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { body: text, preview_url: true },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return {
        ok: false,
        reason: `Meta API ${res.status}: ${errBody.slice(0, 300)}`,
      };
    }

    const data = (await res.json()) as {
      messages?: Array<{ id: string }>;
    };
    const messageId = data.messages?.[0]?.id ?? "";
    return { ok: true, messageId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: `Network error: ${msg}` };
  }
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN
  );
}
