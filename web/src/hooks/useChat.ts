"use client";

import { useCallback, useState } from "react";
import type { NeuroAction } from "@/lib/actions";

export type ChatMsg = { role: "user" | "assistant"; content: string };

/**
 * useChat — manages conversation history with Neuro.
 *
 * Calls /api/chat with the full message history each turn (the server
 * prepends the system prompt and uses prompt caching so this is cheap).
 * Returns the assistant's reply as a plain string and appends both user +
 * assistant turns to local state.
 */
export function useChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (
      userText: string,
      brand?: string
    ): Promise<{ reply: string; actions: NeuroAction[] }> => {
      const user: ChatMsg = { role: "user", content: userText };
      // Build the new history synchronously so this turn is sent to the API.
      const next = [...messages, user];
      setMessages(next);
      setIsThinking(true);
      setError(null);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: next, brand }),
        });
        const json = (await res.json()) as {
          reply?: string;
          actions?: NeuroAction[];
          error?: string;
        };
        if (!res.ok || json.error) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }
        const reply = (json.reply ?? "").trim();
        const actions = json.actions ?? [];
        setMessages([...next, { role: "assistant", content: reply }]);
        return { reply, actions };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        // Spoken-aloud fallback so the user knows something went wrong
        const fallback = msg.includes("ANTHROPIC_API_KEY")
          ? "I'm not connected yet. Please add your Anthropic API key to the env file."
          : "I'm having trouble reaching my brain right now. Please try again in a moment.";
        return { reply: fallback, actions: [] };
      } finally {
        setIsThinking(false);
      }
    },
    [messages]
  );

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isThinking, error, sendMessage, reset };
}
