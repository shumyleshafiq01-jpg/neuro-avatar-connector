"use client";

import { useEffect, useState } from "react";

type Props = {
  isFullscreen: boolean;
  onEnter: () => void;
};

export default function FullscreenPrompt({ isFullscreen, onEnter }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  // Slight delay so it fades in instead of flashing on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 250);
    return () => clearTimeout(t);
  }, []);

  if (isFullscreen || dismissed) return null;

  return (
    <div
      className={[
        "pointer-events-none absolute inset-x-0 top-6 z-10 flex justify-center px-4 transition-opacity duration-700",
        visible ? "opacity-100" : "opacity-0",
      ].join(" ")}
    >
      <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-full border border-[var(--color-gold)]/30 bg-black/60 px-4 py-2 backdrop-blur-md sm:gap-4 sm:px-5 sm:py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--color-gold)]/90 sm:text-xs">
          Go fullscreen for full features
        </span>
        <button
          type="button"
          onClick={onEnter}
          className="rounded-full border border-[var(--color-gold)]/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--color-gold)] transition hover:bg-[var(--color-gold)]/10 active:scale-95 sm:text-xs"
        >
          Enter
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="font-mono text-sm leading-none text-white/40 transition hover:text-white/80"
        >
          ×
        </button>
      </div>
    </div>
  );
}
