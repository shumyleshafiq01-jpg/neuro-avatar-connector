"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  visible: boolean;
  isThinking: boolean;
  speakReplies: boolean;
  onSend: (text: string) => void;
  onToggleSpeakReplies: () => void;
  onClose: () => void;
};

/**
 * ChatInput — typing channel for visitors who can't or don't want to speak.
 *
 * Slides up above the control bar when Chat mode is active. Uses the same
 * /api/chat endpoint as voice mode (same brain, same tools, same knowledge
 * base, same lead pipeline) — only the input modality changes.
 *
 * Accessibility:
 *   - Speaker toggle lets users choose whether replies are also spoken aloud
 *     (default: silent, since typing implies the user is in a quiet
 *     environment or hearing-impaired and doesn't need audio).
 *   - Enter sends, Shift+Enter adds a newline.
 *   - Focus auto-grabs when the panel opens.
 */
export default function ChatInput({
  visible,
  isThinking,
  speakReplies,
  onSend,
  onToggleSpeakReplies,
  onClose,
}: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-focus when the panel opens
  useEffect(() => {
    if (visible && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [visible]);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;
    onSend(trimmed);
    setText("");
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[12%] z-30 flex justify-center px-3 sm:bottom-[13%] sm:px-6">
      <div className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-cyan-400/40 bg-black/75 p-3 shadow-2xl backdrop-blur-md sm:p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-300/80 sm:text-xs">
            Type to Neuro
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleSpeakReplies}
              className={[
                "rounded-full border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.25em] transition sm:text-[10px]",
                speakReplies
                  ? "border-[var(--color-gold)] bg-[var(--color-gold)]/15 text-[var(--color-gold)]"
                  : "border-white/20 text-white/50 hover:border-white/40 hover:text-white/70",
              ].join(" ")}
              title={speakReplies ? "Replies are spoken aloud" : "Replies stay silent"}
            >
              {speakReplies ? "Audio ON" : "Audio OFF"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/15 px-2 py-1 font-mono text-xs text-white/50 transition hover:border-white/40 hover:text-white/80"
              aria-label="Close chat"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            disabled={isThinking}
            rows={1}
            placeholder={
              isThinking ? "Neuro is thinking…" : "Type your message and press Enter…"
            }
            className="flex-1 resize-none rounded-xl border border-cyan-300/20 bg-black/40 px-3 py-2 text-sm text-white placeholder-white/30 outline-none transition focus:border-cyan-300/60 disabled:opacity-50 sm:text-base"
            style={{ minHeight: "2.25rem", maxHeight: "8rem" }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={isThinking || text.trim().length === 0}
            className={[
              "rounded-xl border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] transition sm:text-xs",
              isThinking || text.trim().length === 0
                ? "cursor-not-allowed border-white/10 text-white/30"
                : "border-cyan-300/60 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/20 active:scale-95",
            ].join(" ")}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
