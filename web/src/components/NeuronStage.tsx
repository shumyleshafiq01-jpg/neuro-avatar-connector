"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Neurons from "./Neurons";
import ControlBar from "./ControlBar";
import FullscreenPrompt from "./FullscreenPrompt";
import NeuroFace from "./Neuro/NeuroFace";
import Captions from "./Captions";
import ChatInput from "./ChatInput";
import { useFaceTracker } from "@/hooks/useFaceTracker";
import { useVoice } from "@/hooks/useVoice";
import { useChat } from "@/hooks/useChat";
import { getBrand } from "@/lib/brands";
import type { NeuroAction } from "@/lib/actions";

export default function NeuronStage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { gaze, status, start, stop } = useFaceTracker();

  // Read white-label brand from `?brand=slug`. Default = NeuroGrid.
  const [brand, setBrand] = useState(getBrand(null));
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("brand");
    setBrand(getBrand(slug));
  }, []);

  // Toast notification for captured leads / triggered actions
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const flashToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  }, []);

  // Execute a list of NeuroActions returned by /api/chat
  const executeActions = useCallback(
    (actions: NeuroAction[]) => {
      for (const a of actions) {
        switch (a.type) {
          case "open_url":
            // New tab, no opener leak
            window.open(a.url, "_blank", "noopener,noreferrer");
            flashToast(`Opening ${a.url.replace(/^https?:\/\//, "")}`);
            break;
          case "capture_lead": {
            const parts = [a.name, a.email, a.interest].filter(Boolean).join(" · ");
            console.log("[lead]", a);
            flashToast(parts ? `Lead captured: ${parts}` : "Lead captured");
            break;
          }
          case "show_product":
            console.log("[show_product]", a.product);
            flashToast(`Highlighting: ${a.product}`);
            break;
        }
      }
    },
    [flashToast]
  );

  // Touch / click on the face area triggers Phase 5 reaction +
  // wakes the avatar from sleep. Stamp = milliseconds since epoch;
  // a fresh stamp signals "fire one reaction" to NeuroHead.
  const [touchAt, setTouchAt] = useState(0);

  // Phase 6: voice + brain
  const {
    isListening,
    isSpeaking,
    transcript,
    liveTranscript,
    supported,
    startListening,
    stopListening,
    speak,
    cancelSpeak,
  } = useVoice();
  const { sendMessage, isThinking, messages } = useChat();
  // `voiceActive` = user has clicked the Mic button at least once and hasn't
  // turned it off. We auto-resume listening between turns until they do.
  const [voiceActive, setVoiceActive] = useState(false);
  const voiceActiveRef = useRef(false);
  voiceActiveRef.current = voiceActive;
  // Track whether we're currently mid-turn so we don't double-handle a transcript
  const handlingTranscriptRef = useRef(false);
  const greetedRef = useRef(false);

  // Phase 10: typing channel for accessibility (deaf/mute users, quiet
  // environments, no-mic devices). Mutually exclusive with voice — clicking
  // one turns off the other so STT and the input box never fight.
  const [chatActive, setChatActive] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(false);

  const toggleVoice = useCallback(async () => {
    if (voiceActive) {
      // Turn everything off
      setVoiceActive(false);
      voiceActiveRef.current = false;
      stopListening();
      cancelSpeak();
      return;
    }
    if (!supported.stt) {
      alert("Your browser doesn't support speech recognition. Try Chrome or Edge, or use the Chat button to type instead.");
      return;
    }
    // Mutually exclusive with chat — turn off chat input if it was open
    if (chatActive) setChatActive(false);
    setVoiceActive(true);
    voiceActiveRef.current = true;
    // First-ever activation: speak the brand greeting, then listen.
    if (!greetedRef.current) {
      greetedRef.current = true;
      await speak(brand.greeting);
    }
    if (voiceActiveRef.current) startListening();
  }, [voiceActive, chatActive, stopListening, cancelSpeak, speak, startListening, supported.stt, brand.greeting]);

  // Open / close the text input. First activation greets in captions only
  // (no audio by default — typing implies the user wants quiet).
  const toggleChat = useCallback(() => {
    if (chatActive) {
      setChatActive(false);
      return;
    }
    // Mutually exclusive with voice
    if (voiceActive) {
      setVoiceActive(false);
      voiceActiveRef.current = false;
      stopListening();
      cancelSpeak();
    }
    setChatActive(true);
  }, [chatActive, voiceActive, stopListening, cancelSpeak]);

  // Send a typed message — same backend, same brain.
  const handleChatSend = useCallback(
    async (userText: string) => {
      const { reply, actions } = await sendMessage(userText, brand.slug);
      if (actions.length > 0) executeActions(actions);
      if (reply && speakReplies) {
        await speak(reply);
      }
    },
    [sendMessage, brand.slug, executeActions, speakReplies, speak]
  );

  // When a transcript finalizes, send it to Claude → execute actions →
  // speak the reply → listen again (if voice is still active).
  useEffect(() => {
    if (!transcript || handlingTranscriptRef.current) return;
    if (!voiceActiveRef.current) return;
    handlingTranscriptRef.current = true;
    (async () => {
      try {
        const { reply, actions } = await sendMessage(transcript, brand.slug);
        // Fire side effects BEFORE speaking, so the URL opens while Neuro
        // narrates the action (better felt continuity).
        if (actions.length > 0) executeActions(actions);
        if (reply) await speak(reply);
      } finally {
        handlingTranscriptRef.current = false;
        if (voiceActiveRef.current) startListening();
      }
    })();
  }, [transcript, sendMessage, speak, startListening, executeActions, brand.slug]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = async () => {
    const el = rootRef.current ?? document.documentElement;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      // Some browsers / iOS Safari block fullscreen — fail silently.
    }
  };

  const cameraOn = status === "running" || status === "loading" || status === "requesting-camera";

  const toggleCamera = () => {
    if (cameraOn) stop();
    else start();
  };

  // "Alive" = something is engaging with Neuro (real face detected, or we'll add voice later)
  const alive = status === "running" && gaze.active;

  return (
    <div
      ref={rootRef}
      className="relative h-dvh w-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-fg)]"
    >
      {/* Top 90% — face stage */}
      <section
        className="absolute inset-x-0 top-0 h-[90%]"
        onPointerDown={() => setTouchAt(Date.now())}
      >
        <Neurons />
        <NeuroFace
          externalGaze={gaze}
          alive={alive || isSpeaking || isListening}
          touchAt={touchAt}
          isSpeaking={isSpeaking}
        />
        {/* Status overlay (top-left) — only when active or denied */}
        <div className="pointer-events-none absolute left-4 top-4 font-mono text-[10px] uppercase tracking-[0.25em] sm:left-6 sm:top-6 sm:text-xs">
          <CameraStatus status={status} />
        </div>
        {/* Captions — show what the user said + Neuro's reply */}
        <Captions
          liveTranscript={liveTranscript}
          lastReply={
            messages.length > 0 && messages[messages.length - 1].role === "assistant"
              ? messages[messages.length - 1].content
              : ""
          }
          isListening={isListening}
          isThinking={isThinking}
          isSpeaking={isSpeaking}
          visible={voiceActive || chatActive}
        />

        {/* Typing channel — accessibility for users who can't or won't speak */}
        <ChatInput
          visible={chatActive}
          isThinking={isThinking}
          speakReplies={speakReplies}
          onSend={handleChatSend}
          onToggleSpeakReplies={() => setSpeakReplies((s) => !s)}
          onClose={() => setChatActive(false)}
        />
      </section>

      {/* Bottom 10% — control bar */}
      <section className="absolute inset-x-0 bottom-0 h-[10%]">
        <ControlBar
          isFullscreen={isFullscreen}
          onFullscreen={toggleFullscreen}
          cameraOn={cameraOn}
          cameraBusy={status === "loading" || status === "requesting-camera"}
          onCamera={toggleCamera}
          alive={alive}
          micOn={voiceActive}
          micBusy={isThinking}
          micState={
            isSpeaking ? "speaking" : isListening ? "listening" : isThinking ? "thinking" : "idle"
          }
          onMic={toggleVoice}
          chatOn={chatActive}
          onChat={toggleChat}
          messageCount={messages.length}
        />
      </section>

      {/* Fullscreen prompt — overlays until dismissed or fullscreen entered */}
      <FullscreenPrompt isFullscreen={isFullscreen} onEnter={toggleFullscreen} />

      {/* Action toast — shows when Neuro opens a URL or captures a lead */}
      {toast ? (
        <div className="pointer-events-none absolute right-4 top-4 z-30 sm:right-6 sm:top-6">
          <div className="rounded-full border border-cyan-300/40 bg-black/70 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-200 shadow-lg backdrop-blur-md sm:text-xs">
            {toast}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CameraStatus({ status }: { status: ReturnType<typeof useFaceTracker>["status"] }) {
  if (status === "idle") return null;
  const map: Record<string, { label: string; color: string }> = {
    loading: { label: "Loading model…", color: "text-[var(--color-gold)]/80" },
    "requesting-camera": { label: "Requesting camera…", color: "text-[var(--color-gold)]/80" },
    running: { label: "● Tracking", color: "text-[var(--color-emerald)]" },
    denied: { label: "Camera denied", color: "text-red-400/90" },
    error: { label: "Camera error", color: "text-red-400/90" },
  };
  const m = map[status];
  if (!m) return null;
  return <span className={m.color}>{m.label}</span>;
}
