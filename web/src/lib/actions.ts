/**
 * Action markers — Neuro's way of triggering real-world side effects.
 *
 * The system prompt teaches Claude to embed markers like
 *   [OPEN_URL:https://neurogridlabs.tech]
 * in its replies. The server parses them out (so the user never hears or
 * reads the marker) and returns them as a structured list. The frontend
 * then executes them: opens tabs, logs leads, etc.
 *
 * Why markers instead of Anthropic's tool-use?
 *   - One-shot: no second round-trip needed, faster TTS start.
 *   - Simpler client/server contract — replies are still plain JSON.
 *   - We can promote any marker to a real tool later without API churn.
 */

export type NeuroAction =
  | { type: "open_url"; url: string }
  | { type: "capture_lead"; name?: string; email?: string; interest?: string }
  | { type: "show_product"; product: string };

const OPEN_URL_RE = /\[OPEN_URL:([^\]]+)\]/g;
const CAPTURE_LEAD_RE = /\[CAPTURE_LEAD:([^\]]+)\]/g;
const SHOW_PRODUCT_RE = /\[SHOW_PRODUCT:([^\]]+)\]/g;

export function parseActions(text: string): {
  cleanText: string;
  actions: NeuroAction[];
} {
  const actions: NeuroAction[] = [];

  // OPEN_URL
  for (const m of text.matchAll(OPEN_URL_RE)) {
    const url = m[1].trim();
    // Basic safety: only allow http(s) URLs
    if (/^https?:\/\//i.test(url)) {
      actions.push({ type: "open_url", url });
    }
  }

  // CAPTURE_LEAD: pipe-delimited key=value
  for (const m of text.matchAll(CAPTURE_LEAD_RE)) {
    const fields = m[1].split("|").reduce(
      (acc, pair) => {
        const eq = pair.indexOf("=");
        if (eq > 0) {
          const k = pair.slice(0, eq).trim().toLowerCase();
          const v = pair.slice(eq + 1).trim();
          if (v) acc[k] = v;
        }
        return acc;
      },
      {} as Record<string, string>
    );
    actions.push({
      type: "capture_lead",
      name: fields.name,
      email: fields.email,
      interest: fields.interest,
    });
  }

  // SHOW_PRODUCT
  for (const m of text.matchAll(SHOW_PRODUCT_RE)) {
    const product = m[1].trim();
    if (product) actions.push({ type: "show_product", product });
  }

  // Strip markers from the text and collapse whitespace
  const cleanText = text
    .replace(OPEN_URL_RE, "")
    .replace(CAPTURE_LEAD_RE, "")
    .replace(SHOW_PRODUCT_RE, "")
    .replace(/\s+/g, " ")
    .trim();

  return { cleanText, actions };
}

export const ACTION_INSTRUCTIONS = `
ACTION MARKERS — invisible commands you can include in your reply.
The user never sees or hears these — they're stripped before display and trigger real browser actions. Embed them anywhere in your reply.

[OPEN_URL:https://example.com]
  Use when the user asks to be shown, taken to, connected with, or to visit a NeuroGrid page or any product.
  Default targets:
    - https://neurogridlabs.tech (main site, fallback for general info)
    - https://schoolportal.live (SchoolOS)
    - https://karachitraumainstitute.netlify.app (NeuroGrid Clinic)
    - https://civicpulsepk.netlify.app (CivicPulse)
  Only include URLs from this list or extras the user explicitly asks for. Never invent URLs.

[CAPTURE_LEAD:name=...|email=...|interest=...]
  Use when the user shares their name, email, phone, or what they want.
  Any subset of fields is fine. Pipe-separate, equals-assign.
  Example: [CAPTURE_LEAD:name=Ali|interest=NeuroGrid Learn]

[SHOW_PRODUCT:Product Name]
  Use to highlight a NeuroGrid product visually. The product name should match one from the arsenal — e.g. "NeuroGrid Learn", "SchoolOS", "Safety Ride", "CivicPulse".

Rules:
  - Don't acknowledge the markers in your speech.
  - At most one OPEN_URL per reply.
  - Markers are case-sensitive — use the exact format above.
`;
