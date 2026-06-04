/**
 * Extract dots and edges from biometric.avif so we render the EXACT
 * constellation in the image — not a procedural approximation.
 *
 *  1. Read the AVIF as raw RGBA pixels via sharp.
 *  2. Compute "cyanness" per pixel (cyan dots dominate; black bg is zero).
 *  3. Non-maximum suppression to find dot centers.
 *  4. For every candidate pair within MAX_LINE_LEN, walk the line and
 *     keep it as an edge if the average cyanness along the segment is
 *     high enough.
 *  5. Output JSON: { width, height, dots, edges } — consumed by the
 *     NeuroHead component.
 */

import sharp from "../web/node_modules/sharp/lib/index.js";
import { writeFileSync } from "node:fs";

const SRC = "biometric.avif";
const OUT = "web/public/biometric.json";

// Tunables
const NMS_RADIUS = 3;          // px — dot non-max suppression neighborhood
const DOT_THRESHOLD = 90;      // min cyanness for a pixel to be considered a dot
const MAX_LINE_LEN = 38;       // px — only consider edges shorter than this
const LINE_AVG_THRESHOLD = 28; // min average cyanness along a candidate edge
const LINE_DROP_PERCENTILE = 0.20; // bottom 20% of sample brightness ignored (resistant to dot bleed-over)

const img = sharp(SRC);
const { data, info } = await img.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
console.log(`source: ${width}×${height}×${channels}`);

const cyanness = (idx) => {
  const r = data[idx];
  const g = data[idx + 1];
  const b = data[idx + 2];
  return Math.max(0, Math.min(g, b) - r * 0.6);
};

// ---- Dot extraction (NMS) ----
const dots = [];
for (let y = NMS_RADIUS; y < height - NMS_RADIUS; y++) {
  for (let x = NMS_RADIUS; x < width - NMS_RADIUS; x++) {
    const idx = (y * width + x) * channels;
    const c = cyanness(idx);
    if (c < DOT_THRESHOLD) continue;
    // Local max?
    let isMax = true;
    for (let dy = -NMS_RADIUS; dy <= NMS_RADIUS && isMax; dy++) {
      for (let dx = -NMS_RADIUS; dx <= NMS_RADIUS && isMax; dx++) {
        if (dx === 0 && dy === 0) continue;
        const ni = ((y + dy) * width + (x + dx)) * channels;
        if (cyanness(ni) > c) isMax = false;
      }
    }
    if (isMax) dots.push([x, y]);
  }
}
console.log(`dots extracted: ${dots.length}`);

// ---- Edge extraction ----
// Spatial bin to skip pairs that are obviously too far.
const BIN = MAX_LINE_LEN;
const bins = new Map();
const binKey = (x, y) => `${Math.floor(x / BIN)}_${Math.floor(y / BIN)}`;
dots.forEach(([x, y], i) => {
  for (const dby of [-1, 0, 1]) {
    for (const dbx of [-1, 0, 1]) {
      const k = `${Math.floor(x / BIN) + dbx}_${Math.floor(y / BIN) + dby}`;
      if (!bins.has(k)) bins.set(k, []);
      bins.get(k).push(i);
    }
  }
});

const edges = [];
const seen = new Set();
for (let i = 0; i < dots.length; i++) {
  const [x1, y1] = dots[i];
  const candidates = bins.get(binKey(x1, y1)) ?? [];
  for (const j of candidates) {
    if (j <= i) continue;
    const key = `${i}_${j}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const [x2, y2] = dots[j];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX_LINE_LEN || dist < 4) continue;

    // Sample interior pixels along the segment (skip 2px each end so we
    // don't pick up the dot glow itself)
    const samples = [];
    const N = Math.max(8, Math.ceil(dist));
    for (let k = 2; k < N - 1; k++) {
      const t = k / N;
      const sx = Math.round(x1 + dx * t);
      const sy = Math.round(y1 + dy * t);
      const idx = (sy * width + sx) * channels;
      samples.push(cyanness(idx));
    }
    if (samples.length === 0) continue;
    // Drop the dimmest tail to ignore line gaps
    samples.sort((a, b) => a - b);
    const cut = Math.floor(samples.length * LINE_DROP_PERCENTILE);
    const trimmed = samples.slice(cut);
    const avg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
    if (avg > LINE_AVG_THRESHOLD) {
      edges.push([i, j]);
    }
  }
}
console.log(`edges extracted: ${edges.length}`);

// Compute centroid + radius (used for both normalization and corner thinning)
let cx = 0, cy = 0;
for (const [x, y] of dots) { cx += x; cy += y; }
cx /= dots.length; cy /= dots.length;
let maxR = 0;
for (const [x, y] of dots) {
  const r = Math.hypot(x - cx, y - cy);
  if (r > maxR) maxR = r;
}
console.log(`centroid: (${cx.toFixed(1)}, ${cy.toFixed(1)}), maxRadius: ${maxR.toFixed(1)}`);

// ---- Corner thinning ----
// Dots in the outer band of the silhouette get a higher chance of being
// dropped. Net result: ~10% global reduction concentrated on the rim,
// preserving the dense feature clusters (eyes, nose, lips) untouched.
const OUTER_RADIUS_FRAC = 0.6;     // beyond 60% of maxR is "outer"
const OUTER_DROP_RATE = 0.18;      // drop 18% of outer dots → ~10% global
let rng = 1;
const seedRand = () => {
  rng = (rng * 16807) % 2147483647;
  return rng / 2147483647;
};
const keptDots = [];
const oldToNew = new Map();
for (let i = 0; i < dots.length; i++) {
  const [x, y] = dots[i];
  const r = Math.hypot(x - cx, y - cy);
  const isOuter = r > OUTER_RADIUS_FRAC * maxR;
  if (isOuter && seedRand() < OUTER_DROP_RATE) continue;
  oldToNew.set(i, keptDots.length);
  keptDots.push([x, y]);
}
const culledEdges = edges
  .filter(([a, b]) => oldToNew.has(a) && oldToNew.has(b))
  .map(([a, b]) => [oldToNew.get(a), oldToNew.get(b)]);
console.log(`after corner thinning: ${keptDots.length} dots, ${culledEdges.length} edges`);

writeFileSync(OUT, JSON.stringify({
  width, height,
  centroid: [cx, cy],
  maxRadius: maxR,
  dots: keptDots,
  edges: culledEdges,
}));
console.log(`wrote ${OUT}`);
