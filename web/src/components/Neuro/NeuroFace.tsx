"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import NeuroHead from "./NeuroHead";

type Props = {
  /** External gaze target in normalized -1..1 coords (e.g. from face tracker) */
  externalGaze?: { x: number; y: number; active: boolean };
  /** Whether the avatar is "awake" (face/voice detected). Drives glow intensity. */
  alive?: boolean;
  /** Timestamp of last touch — increments fire a Phase-5 reaction in NeuroHead */
  touchAt?: number;
  /** Whether TTS is currently speaking — drives the talking pulse on the face */
  isSpeaking?: boolean;
};

/**
 * Wraps NeuroHead in an R3F canvas with lighting.
 *
 * Mouse fallback: if no externalGaze is active, we follow the cursor.
 * The pointer is tracked at the *window* level so the cursor doesn't have to be
 * inside the canvas (the bottom 10% control bar still drives gaze).
 */
export default function NeuroFace({
  externalGaze,
  alive = false,
  touchAt = 0,
  isSpeaking = false,
}: Props) {
  const [mouseGaze, setMouseGaze] = useState({ x: 0, y: 0, active: false });
  const idleTimer = useRef<number | null>(null);

  // R3F's initial measurement can latch onto a 0x0 size during SSR-to-client hydration.
  // Dispatch a resize after mount to force it to re-measure the actual container.
  useEffect(() => {
    const t1 = setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
    const t2 = setTimeout(() => window.dispatchEvent(new Event("resize")), 250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMouseGaze({ x, y, active: true });

      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => {
        setMouseGaze((g) => ({ ...g, active: false }));
      }, 2500);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, []);

  // External (face) gaze takes priority over mouse
  const gaze =
    externalGaze && externalGaze.active ? externalGaze : mouseGaze;

  return (
    <Canvas
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      camera={{ position: [0, 0, 5], fov: 38 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.6} />
      <pointLight position={[3, 4, 4]} intensity={1.4} color="#10b981" />
      <pointLight position={[-3, -2, 4]} intensity={0.6} color="#d4af37" />
      <Suspense fallback={null}>
        <NeuroHead
          gaze={gaze}
          alive={alive || (externalGaze?.active ?? false)}
          touchAt={touchAt}
          isSpeaking={isSpeaking}
        />
      </Suspense>
    </Canvas>
  );
}
