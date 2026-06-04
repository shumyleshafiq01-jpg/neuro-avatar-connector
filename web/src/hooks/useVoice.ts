"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useVoice — Web Speech API wrapper for STT + TTS.
 *
 * STT: SpeechRecognition (Chromium / Edge / Safari). Listens once per
 * `startListening()` call, finalizes when the user pauses, fires a final
 * transcript via the `transcript` state.
 *
 * TTS: speechSynthesis. `speak(text)` returns a promise that resolves when
 * the utterance finishes playing.
 *
 * Both are *free* and built into the browser. We can swap TTS to ElevenLabs
 * later for a branded voice without touching anything else.
 */

type SRResult = {
  0: { transcript: string };
  isFinal: boolean;
};
type SREvent = {
  resultIndex: number;
  results: ArrayLike<SRResult> & { length: number };
};
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SREvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type WindowWithSR = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export function useVoice() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  /** Final transcript — only updates when STT marks a result `isFinal`. Used as
   *  the trigger to send to /api/chat. */
  const [transcript, setTranscript] = useState("");
  /** Live (interim or final) transcript — updates word-by-word as you speak.
   *  Used by Captions for live display. */
  const [liveTranscript, setLiveTranscript] = useState("");
  const [supported, setSupported] = useState({ stt: false, tts: false });

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  // Track listening intent vs. native state to avoid races on auto-restart
  const wantListeningRef = useRef(false);

  // Initialize SpeechRecognition once
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as WindowWithSR;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    const ttsOk = typeof window.speechSynthesis !== "undefined";
    setSupported({ stt: !!SR, tts: ttsOk });
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true; // for live captions
    rec.lang = "en-US";
    rec.onresult = (e) => {
      // Concatenate everything since this turn started — STT delivers a
      // running list of results; finals stay finalised, interims update.
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0]?.transcript ?? "";
        if (r.isFinal) finalText += t;
        else interimText += t;
      }
      const live = (finalText + " " + interimText).trim();
      if (live) setLiveTranscript(live);
      // Only the *final* portion triggers a send (avoids spamming /api/chat
      // on every interim word).
      const finalTrim = finalText.trim();
      if (finalTrim) setTranscript(finalTrim);
    };
    rec.onend = () => {
      setIsListening(false);
    };
    rec.onerror = (e) => {
      // "no-speech" and "aborted" are common and not user-facing problems
      if (e.error !== "no-speech" && e.error !== "aborted") {
        console.warn("[useVoice] STT error:", e.error);
      }
      setIsListening(false);
    };
    recRef.current = rec;
  }, []);

  // Cache voice list (loads asynchronously in some browsers)
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const refresh = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    refresh();
    window.speechSynthesis.onvoiceschanged = refresh;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const startListening = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    setTranscript("");
    setLiveTranscript("");
    wantListeningRef.current = true;
    try {
      rec.start();
      setIsListening(true);
    } catch {
      // already started — ignore
    }
  }, []);

  const stopListening = useCallback(() => {
    wantListeningRef.current = false;
    try {
      recRef.current?.stop();
    } catch {
      // ignore
    }
    setIsListening(false);
  }, []);

  /**
   * Speak text aloud. Resolves when finished (or fails fast if TTS unsupported).
   * Picks a male English voice if one is available; otherwise the first English
   * voice. Rate slightly above 1 + lower pitch = warmer-but-quick delivery.
   *
   * Pronunciation map: TTS engines pronounce by spelling, which butchers
   * unfamiliar names. We rewrite known names to their phonetic spelling
   * BEFORE handing the text to the engine — captions still display the
   * original (correctly-spelled) text from the chat state.
   */
  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        return resolve();
      }
      // ---- Pronunciation rewrites ----
      // "Shumyle" should sound like "shoe + mile" → /ʃuː maɪl/
      // We feed the engine "Shoe Mile" because both are common English
      // words it knows how to pronounce correctly.
      let speech = text;
      const PRONUNCIATIONS: Array<[RegExp, string]> = [
        [/\bShumyle\b/gi, "Shoe Mile"],
        [/\bSheikh\s+Shumyle\b/gi, "Sheikh Shoe Mile"],
      ];
      for (const [pat, rep] of PRONUNCIATIONS) {
        speech = speech.replace(pat, rep);
      }
      // Cancel anything in flight so replies don't pile up
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(speech);
      const voices = voicesRef.current;
      const englishVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
      // Prefer an explicitly-male voice, else pick a default English one.
      // Voice names vary by OS — we look for common male identifiers.
      const malePatterns = /(male|david|mark|alex|daniel|fred|guy|microsoft george)/i;
      const male = englishVoices.find((v) => malePatterns.test(v.name));
      const fallback = englishVoices[0] ?? voices[0];
      if (male) utt.voice = male;
      else if (fallback) utt.voice = fallback;
      utt.rate = 1.05;
      utt.pitch = 0.92;
      utt.volume = 1;
      utt.onstart = () => setIsSpeaking(true);
      utt.onend = () => {
        setIsSpeaking(false);
        resolve();
      };
      utt.onerror = () => {
        setIsSpeaking(false);
        resolve();
      };
      window.speechSynthesis.speak(utt);
    });
  }, []);

  const cancelSpeak = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        recRef.current?.abort();
      } catch {
        // ignore
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    isListening,
    isSpeaking,
    transcript,
    liveTranscript,
    supported,
    startListening,
    stopListening,
    speak,
    cancelSpeak,
  };
}
