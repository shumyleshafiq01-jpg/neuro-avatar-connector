/**
 * /api/chat — web voice channel.
 *
 * Hands the conversation off to the shared neuroBrain. Same brain powers
 * /api/whatsapp/webhook so personality, knowledge, and lead pipeline
 * stay consistent across channels.
 */

import { callNeuroBrain, type Msg } from "@/lib/neuroBrain";

export async function POST(request: Request) {
  let body: { messages?: Msg[]; brand?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = (body.messages ?? []).filter(
    (m) =>
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" &&
      m.content.length > 0
  );

  if (messages.length === 0) {
    return Response.json({ error: "No messages" }, { status: 400 });
  }

  try {
    const result = await callNeuroBrain(messages, {
      brand: body.brand,
      channel: "voice",
    });
    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/chat] error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
