"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";

export type GazeTarget = { x: number; y: number; active: boolean };

export type FaceTrackerStatus =
  | "idle"
  | "loading"
  | "requesting-camera"
  | "running"
  | "denied"
  | "error";

const SMOOTHING = 0.25; // EMA factor for gaze smoothing
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const VISION_WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm";

/**
 * Browser-only face tracker built on MediaPipe FaceLandmarker.
 *
 * Returns:
 *  - gaze: normalized (-1..1, -1..1) target where Neuro should look
 *  - status: lifecycle for UI feedback
 *  - start / stop: user-gesture-initiated controls
 *
 * The user is never shown on screen — we only consume landmark coords.
 */
export function useFaceTracker() {
  const [status, setStatus] = useState<FaceTrackerStatus>("idle");
  const [gaze, setGaze] = useState<GazeTarget>({ x: 0, y: 0, active: false });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const smoothedRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const runningRef = useRef(false);
  const consoleRestoreRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.remove();
      videoRef.current = null;
    }
    if (landmarkerRef.current) {
      landmarkerRef.current.close();
      landmarkerRef.current = null;
    }
    if (consoleRestoreRef.current) {
      consoleRestoreRef.current();
      consoleRestoreRef.current = null;
    }
    setGaze({ x: 0, y: 0, active: false });
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    if (runningRef.current) return;
    setErrorMsg(null);
    setStatus("loading");

    // MediaPipe's WASM internals call console.error("INFO: ...") — that's a
    // benign TFLite info log routed through stderr. Next.js's dev overlay
    // promotes it to a red error. Filter just those lines while we're running.
    const origError = console.error;
    console.error = (...args: unknown[]) => {
      if (
        typeof args[0] === "string" &&
        (args[0].startsWith("INFO:") || args[0].startsWith("W0000"))
      ) {
        return;
      }
      origError.apply(console, args as []);
    };
    consoleRestoreRef.current = () => {
      console.error = origError;
    };

    try {
      // 1. Load MediaPipe model
      const fileset = await FilesetResolver.forVisionTasks(VISION_WASM);
      const landmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
      landmarkerRef.current = landmarker;

      // 2. Request camera
      setStatus("requesting-camera");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;

      // 3. Hidden video element to feed into MediaPipe
      const video = document.createElement("video");
      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;
      video.autoplay = true;
      video.style.position = "fixed";
      video.style.left = "-9999px";
      video.style.top = "-9999px";
      video.width = 640;
      video.height = 480;
      document.body.appendChild(video);
      videoRef.current = video;

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve();
      });
      await video.play();

      runningRef.current = true;
      setStatus("running");

      let lastVideoTime = -1;

      const detect = () => {
        if (!runningRef.current || !landmarkerRef.current || !videoRef.current) return;
        const v = videoRef.current;
        if (v.currentTime !== lastVideoTime && v.videoWidth > 0) {
          lastVideoTime = v.currentTime;
          let result: FaceLandmarkerResult | null = null;
          try {
            result = landmarkerRef.current.detectForVideo(v, performance.now());
          } catch {
            // Ignore frame errors — common during teardown
          }
          if (result?.faceLandmarks?.length) {
            const lms = result.faceLandmarks[0];
            // Use the average of the iris-region landmarks as the gaze center.
            // FaceLandmarker normalizes coords to 0..1 (x = horizontal, y = vertical).
            // Indices for iris centers: 468 (left iris center), 473 (right iris center).
            // If iris refinement is off (default for face_landmarker.task), fall back to
            // landmark 1 (nose tip) which still gives a stable head-position signal.
            const left = lms[468] ?? lms[33];
            const right = lms[473] ?? lms[263];
            let cx: number;
            let cy: number;
            if (left && right) {
              cx = (left.x + right.x) / 2;
              cy = (left.y + right.y) / 2;
            } else {
              const nose = lms[1] ?? lms[0];
              cx = nose?.x ?? 0.5;
              cy = nose?.y ?? 0.5;
            }
            // Normalize to -1..1; flip x because the webcam mirrors the user.
            const rawX = -((cx - 0.5) * 2);
            const rawY = (cy - 0.5) * 2;
            // Exponential moving average for smoothness
            smoothedRef.current.x =
              smoothedRef.current.x * (1 - SMOOTHING) + rawX * SMOOTHING;
            smoothedRef.current.y =
              smoothedRef.current.y * (1 - SMOOTHING) + rawY * SMOOTHING;
            setGaze({
              x: Math.max(-1, Math.min(1, smoothedRef.current.x * 1.4)),
              y: Math.max(-1, Math.min(1, smoothedRef.current.y * 1.4)),
              active: true,
            });
          } else {
            // No face — let gaze drift back to center
            setGaze((g) => (g.active ? { ...g, active: false } : g));
          }
        }
        rafRef.current = requestAnimationFrame(detect);
      };
      rafRef.current = requestAnimationFrame(detect);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      // NotAllowedError = user denied permission
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        setStatus("denied");
      } else {
        setStatus("error");
      }
      // Cleanup partial state
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
      runningRef.current = false;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stop(), [stop]);

  return { gaze, status, errorMsg, start, stop };
}
