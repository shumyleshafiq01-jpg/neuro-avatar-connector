"use client";

import { useEffect, useState } from "react";

type Props = {
  /** Live (interim+final) transcript of what the user is saying right now */
  liveTranscript: string;
  /** Most recent assistant reply (string) */
  lastReply: string;
  isListening: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  /** When false, the captions panel is fully hidden. Show only when the
   *  user has activated voice mode. */
  visible: boolean;
};

/**
 * Captions — speech subtitles below the avatar.
 *
 * Two stacked panels:
 *   - YOU      : what the user is saying (live STT transcript)
 *   - NEURO    : what Neuro is saying / about to say
 *
 * Each panel auto-hides when there's nothing relevant for it to display, so
 * a single one-sided exchange (e.g. you've just asked something) only shows
 * one panel at a time. After the conversation ends, the last reply lingers
 * for a few seconds then fades.
 */
export default function Captions({
  liveTranscript,
  lastReply,
  isListening,
  isThinking,
  isSpeaking,
  visible,
}: Props) {
  // Persist Neuro's last reply for ~8s after isSpeaking ends, then fade.
  const [neuroVisible, setNeuroVisible] = useState(false);
  useEffect(() => {
    if (isThinking || isSpeaking) {
      setNeuroVisible(true);
      return;
    }
    if (!lastReply) {
      setNeuroVisible(false);
      return;
    }
    const t = setTimeout(() => setNeuroVisible(false), 8000);
    return () => clearTimeout(t);
  }, [isThinking, isSpeaking, lastReply]);

  if (!visible) return null;

  // What to show in the user panel:
  //   - while listening: the live transcript (or "Listening…" when empty)
  //   - briefly after they stopped (during thinking): the final transcript
  //     of what they said, so they have a moment to read it
  const showUser = isListening || (isThinking && liveTranscript.length > 0);
  const userText =
    liveTranscript || (isListening ? "Listening…" : "");

  // Neuro panel content
  const neuroText = isThinking
    ? "Thinking…"
    : lastReply || "";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:gap-3">
      {/* You */}
      <div
        className={[
          "max-w-2xl rounded-2xl border border-cyan-400/30 bg-black/55 px-4 py-2 text-center shadow-lg backdrop-blur-md transition-opacity duration-300",
          showUser ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-cyan-300/70 sm:text-[10px]">
          You
        </div>
        <div className="mt-1 text-xs text-white/85 sm:text-sm">
          {userText || " "}
        </div>
      </div>

      {/* Neuro */}
      <div
        className={[
          "max-w-2xl rounded-2xl border border-cyan-300/40 bg-black/65 px-4 py-2 text-center shadow-lg backdrop-blur-md transition-opacity duration-300",
          neuroVisible ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-cyan-200/80 sm:text-[10px]">
          Neuro
        </div>
        <div className="mt-1 text-xs text-white/95 sm:text-sm">
          {neuroText || " "}
        </div>
      </div>
    </div>
  );
}
