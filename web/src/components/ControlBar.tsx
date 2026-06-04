"use client";

type MicState = "idle" | "listening" | "thinking" | "speaking";

type Props = {
  isFullscreen: boolean;
  onFullscreen: () => void;
  cameraOn: boolean;
  cameraBusy: boolean;
  onCamera: () => void;
  alive: boolean;
  micOn: boolean;
  micBusy: boolean;
  micState: MicState;
  onMic: () => void;
  chatOn: boolean;
  onChat: () => void;
  messageCount: number;
};

export default function ControlBar({
  isFullscreen,
  onFullscreen,
  cameraOn,
  cameraBusy,
  onCamera,
  alive,
  micOn,
  micBusy,
  micState,
  onMic,
  chatOn,
  onChat,
  messageCount,
}: Props) {
  // Headline status — voice state takes priority since it's the active conversation channel
  const statusLabel =
    micState === "speaking"
      ? "speaking"
      : micState === "listening"
        ? "listening"
        : micState === "thinking"
          ? "thinking…"
          : alive
            ? "engaged"
            : cameraOn
              ? "watching"
              : "idle";

  const micLabel =
    micState === "speaking"
      ? "Speaking"
      : micState === "listening"
        ? "Listening"
        : micState === "thinking"
          ? "Thinking…"
          : micOn
            ? "Mic On"
            : "Mic";

  return (
    <div className="relative h-full w-full border-t border-[var(--color-emerald)]/15 bg-black/40 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-8">
        <div className="flex items-center gap-2">
          <span
            className={[
              "h-2 w-2 rounded-full",
              micState === "speaking" || micState === "listening"
                ? "bg-[var(--color-gold)]"
                : alive
                  ? "bg-[var(--color-gold)]"
                  : "bg-[var(--color-emerald)]",
              "animate-pulse",
            ].join(" ")}
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/60 sm:text-xs">
            Neuro · {statusLabel}
            {messageCount > 0 ? (
              <span className="ml-2 text-white/30">· {messageCount} msg</span>
            ) : null}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ControlButton
            label={micLabel}
            onClick={onMic}
            active={micOn}
            busy={micBusy}
          />
          <ControlButton
            label={cameraBusy ? "Camera…" : cameraOn ? "Camera On" : "Camera"}
            onClick={onCamera}
            active={cameraOn}
            busy={cameraBusy}
          />
          <ControlButton
            label={chatOn ? "Chat On" : "Chat"}
            onClick={onChat}
            active={chatOn}
          />
          <ControlButton
            label={isFullscreen ? "Exit FS" : "Fullscreen"}
            onClick={onFullscreen}
          />
        </div>
      </div>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  disabled,
  active,
  busy,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className={[
        "rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em] transition sm:px-4 sm:py-2 sm:text-xs",
        disabled
          ? "cursor-not-allowed border-white/10 text-white/30"
          : active
            ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20"
            : "border-[var(--color-emerald)]/40 text-[var(--color-emerald)] hover:border-[var(--color-emerald)] hover:bg-[var(--color-emerald)]/10 active:scale-95",
        busy ? "animate-pulse" : "",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
