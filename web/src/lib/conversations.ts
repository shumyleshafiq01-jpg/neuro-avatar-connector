/**
 * In-memory per-user conversation store.
 *
 * Keys = user identifier (e.g., WhatsApp phone number, browser session).
 * Values = recent conversation history.
 *
 * Persists for the lifetime of the dev server only — restarts wipe it.
 * For production, swap this for Redis / Postgres / Sheet-tab-3.
 */

import type { Msg } from "./neuroBrain";

const MAX_TURNS_PER_USER = 24; // 12 user + 12 assistant ≈ comfortable context window

const store = new Map<string, Msg[]>();

export function getHistory(userId: string): Msg[] {
  return store.get(userId) ?? [];
}

export function appendHistory(userId: string, ...msgs: Msg[]): Msg[] {
  const existing = store.get(userId) ?? [];
  const next = [...existing, ...msgs].slice(-MAX_TURNS_PER_USER);
  store.set(userId, next);
  return next;
}

export function clearHistory(userId: string): void {
  store.delete(userId);
}
