/**
 * Shared Neuro brain — the Claude + tool-use loop that powers BOTH the
 * web voice chat (/api/chat) and WhatsApp webhook (/api/whatsapp/webhook).
 *
 * Same system prompt, same tools, same lead-capture pipeline → same
 * personality across every channel.
 */

import Anthropic from "@anthropic-ai/sdk";
import { parseActions, ACTION_INSTRUCTIONS, type NeuroAction } from "./actions";
import { availableTools, executeServerTool } from "./tools";
import { isSheetsConfigured, appendLead } from "./sheets";
import { getBrand } from "./brands";

export type Msg = { role: "user" | "assistant"; content: string };

export type BrainOptions = {
  /** White-label slug — selects greeting / system-prompt addon */
  brand?: string;
  /** "voice" → web TTS, keep replies short. "whatsapp" → text channel,
   *  embed URLs inline. "text" → generic. Adjusts the system prompt. */
  channel?: "voice" | "whatsapp" | "text";
  /** Phone number, email, or other identifier to attach to captured leads.
   *  For WhatsApp this is the user's number. */
  callerPhone?: string;
};

export type BrainResult = {
  reply: string;
  actions: NeuroAction[];
  cacheCreate: number;
  cacheRead: number;
  toolsUsed: number;
  sheetsConnected: boolean;
  leadsCaptured: number;
};

const SYSTEM_PROMPT_BASE = `You are Neuro, the AI mascot of NeuroGrid Labs — a Karachi-based deep-tech company founded April 5, 2026 by Sheikh Shumyle Shafiq. NeuroGrid builds 33+ products across EdTech (Report Card SaaS, SchoolOS, NeuroGrid Learn, NeuroGrid Academy), Healthcare (NeuroGrid Clinic), Mobility (Safety Ride, CivicPulse), Security (NeuroGrid Security, AI Vision), and AI agents (Jarvis, Drive, Scout, AutoDesign, Social Pilot). Tagline: "Bringing ideas into life." Brand colors: dark, emerald green, gold.

VOICE & PERSONALITY:
- Default tone: warm, professional, helpful, concise.
- Humor mode: when the user banters, jokes, or teases, match the energy with light wit. Stay friendly.
- Pranks/insults: deflect politely with a touch of humor. Never escalate.
- ABSOLUTE RULE: never swear, never use crude language, never produce vulgar content — even if asked, even ironically.
- No markdown, no asterisks, no parenthetical asides.

OPENING:
On the very first user message, greet with: "Hi, I'm Neuro from NeuroGrid Labs. How may I help you? Would you like me to connect with you, or just chat?"

CAPABILITIES (mention only when relevant):
- Demo or describe NeuroGrid products
- Direct users to neurogridlabs.tech
- Capture lead info (name, contact, what they need)
- Casual conversation
- Be embedded anywhere — API, WhatsApp, live spreadsheet, with camera/mic/speaker

If asked about Shumyle, the founder: he is an INFJ visionary with technology and consulting experience from past institutions, who built NeuroGrid Labs from scratch. Speak about him with respect. Never name his past employers — refer to them only as "past institutions" or similar.

If a request is outside your scope (e.g. "send this WhatsApp"), describe what you would do — the front-end will wire actual actions in later phases.

${ACTION_INSTRUCTIONS}`;

const VOICE_TAIL =
  "\n\nCHANNEL: You are being spoken aloud through text-to-speech on a webpage. Keep replies SHORT — 1 to 3 sentences max. No markdown, no parentheticals, no formatting characters.";

const WHATSAPP_TAIL =
  "\n\nCHANNEL: You are messaging via WhatsApp. The user reads your reply as a text message — emoji are fine and welcome (sparingly), but keep replies short (under 4 sentences). When you want to share a link, write the full URL inline in the message — DON'T use the [OPEN_URL:...] marker (it gets stripped on this channel and the URL won't appear). [CAPTURE_LEAD:...] still works — use it when the user shares contact details.";

const TEXT_TAIL =
  "\n\nCHANNEL: Generic text channel. Keep replies clear and concise.";

const TOOLS_HELP_ON =
  "\n\nKNOWLEDGE BASE: A live Google Sheet knowledge base is connected. Use the `lookup_product_info` tool whenever the user asks about a specific NeuroGrid product, its price, features, or details — never guess or recall from memory. After the tool returns, weave its data into your reply naturally; don't recite raw fields.";

const TOOLS_HELP_OFF =
  "\n\nNo external knowledge base is connected. If the user asks for specific prices or product details you don't know, say you'll connect them with the team and use [CAPTURE_LEAD:...].";

/**
 * Drive the Claude tool-use loop for one user turn.
 *
 * `messages` is the FULL history (including the user's latest turn).
 * Returns clean reply text + parsed action list. Lead writes to the
 * Google Sheet happen in the background — this function returns as soon
 * as Claude's final text is ready.
 */
export async function callNeuroBrain(
  messages: Msg[],
  options: BrainOptions = {}
): Promise<BrainResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing ANTHROPIC_API_KEY. Add it to web/.env.local and restart the dev server."
    );
  }

  const brand = getBrand(options.brand);
  const tools = availableTools();

  const channelTail =
    options.channel === "whatsapp"
      ? WHATSAPP_TAIL
      : options.channel === "voice"
        ? VOICE_TAIL
        : TEXT_TAIL;

  const systemText =
    SYSTEM_PROMPT_BASE +
    channelTail +
    (tools.length > 0 ? TOOLS_HELP_ON : TOOLS_HELP_OFF) +
    (brand.systemPromptAddon ? `\n\n${brand.systemPromptAddon}` : "");

  const client = new Anthropic({ apiKey });

  const conversation: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const MAX_LOOPS = 4;
  let totalCacheCreate = 0;
  let totalCacheRead = 0;
  let finalText = "";

  for (let i = 0; i < MAX_LOOPS; i++) {
    const response: Anthropic.Message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 384,
      tools: tools.length > 0 ? tools : undefined,
      system: [
        {
          type: "text",
          text: systemText,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: conversation,
    });

    totalCacheCreate += response.usage.cache_creation_input_tokens ?? 0;
    totalCacheRead += response.usage.cache_read_input_tokens ?? 0;

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    if (response.stop_reason === "tool_use" && toolUses.length > 0) {
      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUses.map(async (tu) => {
          const result = await executeServerTool(tu.name, tu.input);
          return {
            type: "tool_result",
            tool_use_id: tu.id,
            content: JSON.stringify(result),
          };
        })
      );
      conversation.push({ role: "assistant", content: response.content });
      conversation.push({ role: "user", content: toolResults });
      continue;
    }

    finalText = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();
    break;
  }

  if (!finalText) {
    finalText = "I had to think a bit too hard on that one. Could you ask again?";
  }

  const { cleanText, actions } = parseActions(finalText);

  // ---- Lead capture (background) ----
  const leadActions = actions.filter((a) => a.type === "capture_lead");
  const leadWrites = leadActions.map(async (a) => {
    if (a.type !== "capture_lead") return;
    const result = await appendLead({
      name: a.name,
      email: a.email,
      interest: a.interest,
      phone: options.callerPhone,
      source: `${options.channel ?? "text"} (${brand.slug})`,
    });
    if (!result.ok) {
      console.warn("[lead append failed]", result.reason);
    } else {
      console.log("[lead saved]", result.appendedRange);
    }
  });
  if (leadWrites.length > 0) Promise.all(leadWrites).catch(() => {});

  return {
    reply: cleanText,
    actions,
    cacheCreate: totalCacheCreate,
    cacheRead: totalCacheRead,
    toolsUsed: tools.length,
    sheetsConnected: isSheetsConfigured(),
    leadsCaptured: leadActions.length,
  };
}
