"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type Props = {
  gaze: { x: number; y: number; active: boolean };
  alive: boolean;
  /** Bumped from parent on click/touch in the face area. Triggers Phase-5
   *  reaction + wakes the avatar from sleep. */
  touchAt: number;
  /** TTS is speaking — drives a fast amplitude pulse on dots & reticle iris */
  isSpeaking: boolean;
};

/** Phase 4 — sleep timer. After this many ms of NO gaze input, eyes close. */
const SLEEP_AFTER_MS = 6000;
/** Phase 5 — reaction duration in seconds. Decays linearly to 0. */
const REACT_DURATION_S = 1.5;

/**
 * Neuro — biometric-scan head, rendered as a literal copy of biometric.avif.
 *
 * `tools/extract-biometric.mjs` reads the source image, finds every glowing
 * dot via NMS, and connects pairs whose connecting pixels are bright enough.
 * The result lands in `/biometric.json` ({ dots, edges, centroid, maxRadius }).
 *
 * This component just consumes that data and renders:
 *   - <points>       glowing cyan dots at every extracted vertex
 *   - <lineSegments> faint cyan triangulation across detected edges
 *   - 2× <EyeReticle> camera-style focus rings in NeuroGrid gold,
 *                    positioned over the face's iris locations.
 *
 * Behaviors:
 *   - Idle: subtle ±5° yaw scan (the constellation stays mostly still — it's
 *     a portrait, not a turntable).
 *   - Alive: locks toward gaze.
 *   - Always: gentle breathing scale, micro-tilt, reticle pulse.
 */

const SCAN = "#3ad5ff";       // base biometric cyan — face dots & wires
const SCAN_RING = "#7de8ff";  // brighter cyan for outer reticle rings
const SCAN_PALE = "#bdf3ff";  // paler cyan for tick marks + inner ring
const SCAN_IRIS = "#ffffff";  // pure white iris core — pops against cyan

// Iris pixel coordinates in the SOURCE image (740×740). Visually picked.
// Tweak these two if the reticles drift off the eyes.
const LEFT_EYE_PX: [number, number] = [275, 312];
const RIGHT_EYE_PX: [number, number] = [464, 312];

type BiometricData = {
  width: number;
  height: number;
  centroid: [number, number];
  maxRadius: number;
  dots: [number, number][];
  edges: [number, number][];
};

function useBiometricData() {
  const [data, setData] = useState<BiometricData | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/biometric.json")
      .then((r) => r.json())
      .then((d: BiometricData) => {
        if (alive) setData(d);
      })
      .catch((e) => console.error("biometric load failed:", e));
    return () => {
      alive = false;
    };
  }, []);
  return data;
}

function makeGlowTexture(): THREE.Texture {
  if (typeof document === "undefined") return new THREE.Texture();
  const size = 64;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return new THREE.Texture();
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,255,255,0.7)");
  g.addColorStop(0.6, "rgba(255,255,255,0.2)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Head ellipsoid:  x²/A² + y²/B² + z²/D² = 1
 *   A = 0.85 (half-width)
 *   B = 0.95 (half-height)
 *   D = 0.65 (front-to-back half-depth)
 * The same ellipsoid is used for the front (biometric) and back (procedural)
 * so the two halves seam cleanly into one closed head.
 */
const HEAD_A = 0.85;
const HEAD_B = 0.95;
const HEAD_D = 0.65;

function makeProjector(d: BiometricData) {
  const [cx, cy] = d.centroid;
  const r = d.maxRadius;
  return (px: number, py: number): [number, number, number] => {
    const x = (px - cx) / r;
    const y = -(py - cy) / r;
    const t = (x * x) / (HEAD_A * HEAD_A) + (y * y) / (HEAD_B * HEAD_B);
    const z = t < 1 ? Math.sqrt(1 - t) * HEAD_D : 0;
    return [x, y, z];
  };
}

/**
 * Generate the *back* of the head — dots on the rear hemisphere of the same
 * ellipsoid, plus wireframe edges between near-neighbors. This is what turns
 * the avatar from a 2D sticker on a curved plane into a closed 3D model.
 *
 * We use a Fibonacci sphere distribution so the dots are evenly spaced
 * (no Poisson clumps), then mirror to the back hemisphere only.
 */
function generateBackHead(count: number) {
  type Pt = [number, number, number];
  const points: Pt[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5)); // golden angle

  for (let i = 0; i < count; i++) {
    // Fibonacci sphere — evenly distributed points on a unit sphere
    const yUnit = 1 - (i / (count - 1)) * 2;     // y from +1 to -1
    const radiusAtY = Math.sqrt(1 - yUnit * yUnit);
    const theta = golden * i;
    let nx = Math.cos(theta) * radiusAtY;
    const ny = yUnit;
    let nz = Math.sin(theta) * radiusAtY;
    // Keep only the back hemisphere — flip z to negative if needed
    if (nz > 0) nz = -nz;
    // Tiny back-bias so points cluster off the seam, not on it
    nz -= 0.04;
    // Scale to head ellipsoid
    points.push([nx * HEAD_A, ny * HEAD_B, nz * HEAD_D]);
  }

  // Nearest-neighbor edges (k=4 per point, deduped)
  const edges: [number, number][] = [];
  const seen = new Set<string>();
  for (let i = 0; i < points.length; i++) {
    const distances: { j: number; d: number }[] = [];
    for (let j = 0; j < points.length; j++) {
      if (j === i) continue;
      const dx = points[i][0] - points[j][0];
      const dy = points[i][1] - points[j][1];
      const dz = points[i][2] - points[j][2];
      distances.push({ j, d: Math.hypot(dx, dy, dz) });
    }
    distances.sort((a, b) => a.d - b.d);
    for (let k = 0; k < 4 && k < distances.length; k++) {
      const j = distances[k].j;
      const key = i < j ? `${i}_${j}` : `${j}_${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([i, j]);
    }
  }

  return { points, edges };
}

// ---- Eye reticle (gold camera focus ring) ----
function EyeReticle({
  position,
  alive,
  gaze,
  asleepRef,
  reactPhaseRef,
}: {
  position: [number, number, number];
  alive: boolean;
  gaze: Props["gaze"];
  /** Live ref to current "asleep" state (true = eyes closed). */
  asleepRef: React.MutableRefObject<boolean>;
  /** Live ref to current reaction phase (0 = idle, 1 = freshly touched). */
  reactPhaseRef: React.MutableRefObject<number>;
}) {
  const ringRef = useRef<THREE.Mesh>(null);
  const lidRef = useRef<THREE.Group>(null);
  const irisRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    // ---- alive lock-on: outer ring tightens ----
    if (ringRef.current) {
      const target = alive ? 0.78 : 1.0;
      const cur = ringRef.current.scale.x;
      const next = THREE.MathUtils.lerp(cur, target, 0.05);
      ringRef.current.scale.set(next, next, 1);
    }
    // ---- sleep: vertical eyelid scale ----
    if (lidRef.current) {
      const target = asleepRef.current ? 0.04 : 1;
      lidRef.current.scale.y = THREE.MathUtils.lerp(
        lidRef.current.scale.y,
        target,
        0.08
      );
    }
    // ---- iris: tiny gaze offset + reaction flash scale ----
    if (irisRef.current) {
      const offX = 0.008;
      const offY = 0.005;
      irisRef.current.position.x = gaze.x * offX;
      irisRef.current.position.y = -gaze.y * offY;
      const reactScale = 1 + reactPhaseRef.current * 0.7;
      irisRef.current.scale.setScalar(reactScale);
    }
  });

  // Almond-shape: scale the whole reticle group horizontally so rings
  // become ellipses matching the actual eye shape in the face mesh.
  // renderOrder=10 + depthTest=false on every material → reticles always
  // draw on top of the face mesh (no more dots/wires occluding the eyes).
  return (
    <group position={position} scale={[1.55, 0.78, 1]} renderOrder={10}>
      <group ref={lidRef}>
        <mesh ref={ringRef} renderOrder={10}>
          <ringGeometry args={[0.055, 0.067, 36]} />
          <meshBasicMaterial
            color={SCAN_RING}
            side={THREE.DoubleSide}
            transparent
            opacity={1}
            toneMapped={false}
            blending={THREE.AdditiveBlending}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
        {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, i) => (
          <mesh
            key={i}
            position={[Math.cos(angle) * 0.078, Math.sin(angle) * 0.078, 0.002]}
            rotation={[0, 0, angle]}
            renderOrder={10}
          >
            <planeGeometry args={[0.018, 0.004]} />
            <meshBasicMaterial
              color={SCAN_PALE}
              transparent
              opacity={0.95}
              toneMapped={false}
              blending={THREE.AdditiveBlending}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.002]} renderOrder={10}>
          <ringGeometry args={[0.036, 0.041, 24]} />
          <meshBasicMaterial
            color={SCAN_PALE}
            side={THREE.DoubleSide}
            transparent
            opacity={0.7}
            toneMapped={false}
            blending={THREE.AdditiveBlending}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
        <mesh ref={irisRef} position={[0, 0, 0.004]} renderOrder={11}>
          <circleGeometry args={[0.024, 24]} />
          <meshBasicMaterial
            color={SCAN_IRIS}
            transparent
            opacity={1}
            toneMapped={false}
            blending={THREE.AdditiveBlending}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}

// ---- Main head ----
export default function NeuroHead({ gaze, alive, touchAt, isSpeaking }: Props) {
  const headGroup = useRef<THREE.Group>(null);
  const { viewport } = useThree();
  const data = useBiometricData();
  const glowTex = useMemo(() => makeGlowTexture(), []);

  // Material refs so we can mutate size/opacity per-frame for the touch flash
  const dotMatRef = useRef<THREE.PointsMaterial>(null);
  const lineMatRef = useRef<THREE.LineBasicMaterial>(null);

  // Phase 4: sleep state — closed eyes after no input for SLEEP_AFTER_MS
  const lastInputAtRef = useRef<number>(performance.now());
  const asleepRef = useRef<boolean>(false);
  // Phase 5: reaction phase (1 → 0 over REACT_DURATION_S)
  const reactPhaseRef = useRef<number>(0);
  const lastTouchHandledRef = useRef<number>(0);

  // Build BufferGeometries — front (locked biometric) + back (procedural)
  const { dotGeom, edgeGeom, leftEyeWorld, rightEyeWorld } = useMemo(() => {
    if (!data) {
      return { dotGeom: null, edgeGeom: null, leftEyeWorld: null, rightEyeWorld: null };
    }
    const project = makeProjector(data);

    // ---- FRONT (biometric, shape locked) ----
    const front: [number, number, number][] = data.dots.map(([px, py]) =>
      project(px, py)
    );

    // ---- BACK (procedural, completes the 3D head) ----
    // ~30% the front density — rear of the head is shown sparser.
    const back = generateBackHead(Math.floor(data.dots.length * 0.32));

    // Combined point geometry
    const total = front.length + back.points.length;
    const positions = new Float32Array(total * 3);
    for (let i = 0; i < front.length; i++) {
      positions[i * 3] = front[i][0];
      positions[i * 3 + 1] = front[i][1];
      positions[i * 3 + 2] = front[i][2];
    }
    for (let i = 0; i < back.points.length; i++) {
      const off = (front.length + i) * 3;
      positions[off] = back.points[i][0];
      positions[off + 1] = back.points[i][1];
      positions[off + 2] = back.points[i][2];
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    dg.computeBoundingSphere();

    // Combined edge geometry
    const totalEdges = data.edges.length + back.edges.length;
    const edgePositions = new Float32Array(totalEdges * 2 * 3);
    for (let i = 0; i < data.edges.length; i++) {
      const [a, b] = data.edges[i];
      const off = i * 6;
      edgePositions[off] = front[a][0];
      edgePositions[off + 1] = front[a][1];
      edgePositions[off + 2] = front[a][2];
      edgePositions[off + 3] = front[b][0];
      edgePositions[off + 4] = front[b][1];
      edgePositions[off + 5] = front[b][2];
    }
    for (let i = 0; i < back.edges.length; i++) {
      const [a, b] = back.edges[i];
      const off = (data.edges.length + i) * 6;
      edgePositions[off] = back.points[a][0];
      edgePositions[off + 1] = back.points[a][1];
      edgePositions[off + 2] = back.points[a][2];
      edgePositions[off + 3] = back.points[b][0];
      edgePositions[off + 4] = back.points[b][1];
      edgePositions[off + 5] = back.points[b][2];
    }
    const eg = new THREE.BufferGeometry();
    eg.setAttribute("position", new THREE.BufferAttribute(edgePositions, 3));

    // Reticles sit on the front face surface at the iris pixels
    const [lex, ley, lez] = project(LEFT_EYE_PX[0], LEFT_EYE_PX[1]);
    const [rex, rey, rez] = project(RIGHT_EYE_PX[0], RIGHT_EYE_PX[1]);

    return {
      dotGeom: dg,
      edgeGeom: eg,
      leftEyeWorld: [lex, ley, lez + 0.04] as [number, number, number],
      rightEyeWorld: [rex, rey, rez + 0.04] as [number, number, number],
    };
  }, [data]);

  useFrame((_state, delta) => {
    if (!headGroup.current) return;
    const now = performance.now();

    // ---- Phase 4: sleep / wake bookkeeping ----
    if (gaze.active) lastInputAtRef.current = now;
    // Touch wakes & triggers reaction
    if (touchAt > lastTouchHandledRef.current) {
      lastTouchHandledRef.current = touchAt;
      lastInputAtRef.current = now;
      reactPhaseRef.current = 1; // start a fresh reaction
    }
    asleepRef.current = now - lastInputAtRef.current > SLEEP_AFTER_MS;

    // ---- Phase 5: react phase decay ----
    if (reactPhaseRef.current > 0) {
      reactPhaseRef.current = Math.max(
        0,
        reactPhaseRef.current - delta / REACT_DURATION_S
      );
    }

    // ---- Apply reaction flash + speaking pulse to dots & lines ----
    const r = reactPhaseRef.current;
    // Speaking pulse: rapid sine on the dot size while TTS is producing audio.
    // Reads as the constellation "talking" — every dot breathes with the voice.
    const speakOsc = isSpeaking
      ? 1 + Math.sin(now * 0.018) * 0.5 // ~3Hz sine
      : 0;
    const speakBoost = isSpeaking ? 0.5 + 0.5 * speakOsc : 0;
    if (dotMatRef.current) {
      dotMatRef.current.size = 0.018 + r * 0.014 + speakBoost * 0.01;
    }
    if (lineMatRef.current) {
      lineMatRef.current.opacity = 0.18 + r * 0.25 + speakBoost * 0.18;
    }

    // ---- Head rotation tracking ----
    // Cursor right (gaze.x > 0) → face turns right (positive yaw — Three.js
    // +Y rotation moves the front-face's left side toward the camera, which
    // reads as the face looking toward viewer-right).
    const sensingX = gaze.active ? gaze.x : 0;
    const sensingY = gaze.active ? gaze.y : 0;

    const targetYaw = THREE.MathUtils.degToRad(28) * sensingX;
    const targetPitch = THREE.MathUtils.degToRad(14) * sensingY;

    headGroup.current.rotation.y = THREE.MathUtils.lerp(
      headGroup.current.rotation.y,
      targetYaw,
      0.08
    );
    headGroup.current.rotation.x = THREE.MathUtils.lerp(
      headGroup.current.rotation.x,
      targetPitch,
      0.08
    );

    // Lock everything else — no breathing, no scan, no micro-tilt, no strafe.
    headGroup.current.rotation.z = 0;
    headGroup.current.position.set(0, 0, 0);
    headGroup.current.scale.setScalar(1);
  });

  // Fit the constellation. The data is normalized to a max radius of 1, so
  // total span is ~2 units. Scale to ~80% of viewport's smaller dimension.
  const headScale = Math.min(viewport.width, viewport.height) * 0.46;

  if (!dotGeom || !edgeGeom || !leftEyeWorld || !rightEyeWorld) return null;

  return (
    <group scale={headScale} position={[0, 0.05, 0]}>
      <group ref={headGroup}>
        {/* Wireframe edges */}
        <lineSegments geometry={edgeGeom}>
          <lineBasicMaterial
            ref={lineMatRef}
            color={SCAN}
            transparent
            opacity={0.18}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>

        {/* Dots */}
        <points geometry={dotGeom}>
          <pointsMaterial
            ref={dotMatRef}
            map={glowTex}
            color={SCAN}
            size={0.018}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            sizeAttenuation
          />
        </points>

        {/* Eye reticles */}
        <EyeReticle
          position={leftEyeWorld}
          alive={alive}
          gaze={gaze}
          asleepRef={asleepRef}
          reactPhaseRef={reactPhaseRef}
        />
        <EyeReticle
          position={rightEyeWorld}
          alive={alive}
          gaze={gaze}
          asleepRef={asleepRef}
          reactPhaseRef={reactPhaseRef}
        />
      </group>
    </group>
  );
}
