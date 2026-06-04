/**
 * Anthropic tool-use definitions for Neuro.
 *
 * "Tools" let Claude REQUEST data before generating his final answer. He
 * decides on his own when to use them, based on the user's question.
 *
 * Server-side tools (executed by /api/chat):
 *   - lookup_product_info  → reads from the Google Sheet knowledge base
 *
 * Frontend-only side effects (passed back as actions in the final reply):
 *   - open_url, capture_lead, show_product (still done via [MARKERS] for
 *     simplicity — see lib/actions.ts)
 *
 * If you add a new server tool, add (1) the tool spec here, (2) a case in
 * `executeServerTool` below, and (3) an instruction in the system prompt.
 */

import type Anthropic from "@anthropic-ai/sdk";
import { lookupProductInfo, isSheetsConfigured } from "./sheets";

export const SERVER_TOOLS: Anthropic.Tool[] = [
  {
    name: "lookup_product_info",
    description:
      "Look up live information about a NeuroGrid product or service from the connected Google Sheet knowledge base. Use this whenever the user asks about pricing, features, descriptions, or details of a specific product. Returns up to 5 matching rows with name, category, price, description, and URL. If the result is empty, the product isn't in the knowledge base yet.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Product name or keyword to search for. Example: 'NeuroGrid Learn' or 'school management' or 'health clinic'.",
        },
      },
      required: ["query"],
    },
  },
];

/** Run a server-side tool and return JSON-serializable result. */
export async function executeServerTool(
  name: string,
  input: unknown
): Promise<unknown> {
  if (name === "lookup_product_info") {
    const q = (input as { query?: string }).query ?? "";
    return await lookupProductInfo(q);
  }
  return { error: `Unknown tool: ${name}` };
}

/** Tools available right now — empty if no knowledge base is configured. */
export function availableTools(): Anthropic.Tool[] {
  if (!isSheetsConfigured()) return [];
  return SERVER_TOOLS;
}
