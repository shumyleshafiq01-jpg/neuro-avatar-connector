"use client";

import { useEffect, useRef } from "react";

type Pointer = { x: number; y: number; active: boolean };

type Node = {
  // Current position
  x: number;
  y: number;
  // Home position — neurons orbit around this and return to it
  hx: number;
  hy: number;
  vx: number;
  vy: number;
  r: number;
  pulse: number; // 0..1, drives subtle brightness flicker
  pulseSpeed: number;
};

const NODE_DENSITY = 1 / 8500; // denser
const MAX_NODES = 240;
const MIN_NODES = 70;
const LINK_DIST = 150; // px — neurons within this distance "connect"
const POINTER_RADIUS = 170; // px — cursor/touch influence radius
const POINTER_FORCE = 0.18; // gentler push
const SPRING_K = 0.008; // pull back to home
const DRAG = 0.94;
const HOME_JITTER = 0.012; // small idle drift around home

export default function Neurons() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<Pointer>({ x: -9999, y: -9999, active: false });
  const nodesRef = useRef<Node[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const seedNodes = () => {
      const target = Math.max(
        MIN_NODES,
        Math.min(MAX_NODES, Math.round(width * height * NODE_DENSITY))
      );
      const nodes: Node[] = [];
      for (let i = 0; i < target; i++) {
        const hx = Math.random() * width;
        const hy = Math.random() * height;
        nodes.push({
          x: hx,
          y: hy,
          hx,
          hy,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          r: 1.2 + Math.random() * 1.5,
          pulse: Math.random(),
          pulseSpeed: 0.003 + Math.random() * 0.01,
        });
      }
      nodesRef.current = nodes;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const oldW = width;
      const oldH = height;
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Re-seed if size changed materially or first run
      if (
        nodesRef.current.length === 0 ||
        Math.abs(width - oldW) > 50 ||
        Math.abs(height - oldH) > 50
      ) {
        seedNodes();
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const setPointer = (clientX: number, clientY: number, active: boolean) => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current = {
        x: clientX - rect.left,
        y: clientY - rect.top,
        active,
      };
    };

    const onMouseMove = (e: MouseEvent) => setPointer(e.clientX, e.clientY, true);
    const onMouseLeave = () =>
      (pointerRef.current = { x: -9999, y: -9999, active: false });
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) setPointer(t.clientX, t.clientY, true);
    };
    const onTouchEnd = () =>
      (pointerRef.current = { x: -9999, y: -9999, active: false });

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    canvas.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    const tick = () => {
      const nodes = nodesRef.current;
      const p = pointerRef.current;

      ctx.clearRect(0, 0, width, height);

      // Update positions
      for (const n of nodes) {
        // Pointer push (gentle)
        if (p.active) {
          const dx = n.x - p.x;
          const dy = n.y - p.y;
          const dist2 = dx * dx + dy * dy;
          const r2 = POINTER_RADIUS * POINTER_RADIUS;
          if (dist2 < r2 && dist2 > 1) {
            const dist = Math.sqrt(dist2);
            // Smoother falloff (squared) so the edge of the radius feels gentler
            const falloff = 1 - dist / POINTER_RADIUS;
            const force = falloff * falloff * POINTER_FORCE;
            n.vx += (dx / dist) * force;
            n.vy += (dy / dist) * force;
          }
        }

        // Spring back to home — gentle restoring force
        n.vx += (n.hx - n.x) * SPRING_K;
        n.vy += (n.hy - n.y) * SPRING_K;

        // Idle wiggle around home
        n.vx += (Math.random() - 0.5) * HOME_JITTER;
        n.vy += (Math.random() - 0.5) * HOME_JITTER;

        // Drag (damps the spring → smooth orbital return, no infinite oscillation)
        n.vx *= DRAG;
        n.vy *= DRAG;

        n.x += n.vx;
        n.y += n.vy;

        n.pulse = (n.pulse + n.pulseSpeed) % 1;
      }

      // Draw connecting lines (the "synapses")
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist2 = dx * dx + dy * dy;
          const max2 = LINK_DIST * LINK_DIST;
          if (dist2 < max2) {
            const t = 1 - Math.sqrt(dist2) / LINK_DIST;
            // Lines flicker in & out → connecting/disconnecting feel
            const flicker =
              0.55 + 0.45 * Math.sin((a.pulse + b.pulse) * Math.PI * 2);
            ctx.strokeStyle = `rgba(16, 185, 129, ${0.34 * t * flicker})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        const brightness = 0.6 + 0.4 * Math.sin(n.pulse * Math.PI * 2);
        ctx.fillStyle = `rgba(16, 185, 129, ${0.85 * brightness})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        // Subtle gold core on a few nodes
        if (n.r > 2) {
          ctx.fillStyle = `rgba(212, 175, 55, ${0.55 * brightness})`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Pointer halo
      if (p.active) {
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, POINTER_RADIUS);
        grad.addColorStop(0, "rgba(16, 185, 129, 0.10)");
        grad.addColorStop(1, "rgba(16, 185, 129, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, POINTER_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      window.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 h-full w-full"
    />
  );
}
