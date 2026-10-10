"use client";

/* A rotating dot globe on a 2D canvas, in the style of the 21st.dev
 * "Interactive Globe" (Fibonacci dot sphere, arcs between markers with light
 * particles travelling along them, drag to rotate, auto-rotate when idle).
 * Built here so the markers, arcs and sizes come from the country results. */

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type GlobeMarker = { id: string; label: string; lat: number; lon: number; weight: number };

const DEG = Math.PI / 180;

type Vec = [number, number, number];

const toVec = (lat: number, lon: number): Vec => [
  Math.cos(lat * DEG) * Math.sin(lon * DEG),
  Math.sin(lat * DEG),
  Math.cos(lat * DEG) * Math.cos(lon * DEG),
];

function slerp(a: Vec, b: Vec, t: number): Vec {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const omega = Math.acos(dot);
  if (omega < 1e-4) return a;
  const s = Math.sin(omega);
  const k1 = Math.sin((1 - t) * omega) / s;
  const k2 = Math.sin(t * omega) / s;
  return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
}

export function DotGlobe({
  markers,
  origin,
  active,
  onHover,
  color = "#2fc7a9",
  accent = "#5b9bff",
  className,
}: {
  markers: GlobeMarker[];
  /** Marker id the arcs start from. */
  origin: string;
  /** Marker to highlight (e.g. the hovered row in a list). */
  active?: string | null;
  onHover?: (id: string | null) => void;
  color?: string;
  accent?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useRef({ markers, origin, active, onHover, color, accent });
  useEffect(() => {
    state.current = { markers, origin, active, onHover, color, accent };
  }, [markers, origin, active, onHover, color, accent]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mono = getComputedStyle(document.documentElement).getPropertyValue("--font-jetbrains").trim() || "monospace";
    const N = 1400;
    const dots: Vec[] = Array.from({ length: N }, (_, i) => {
      const y = 1 - (2 * (i + 0.5)) / N;
      const r = Math.sqrt(1 - y * y);
      const th = Math.PI * (3 - Math.sqrt(5)) * i;
      return [Math.cos(th) * r, y, Math.sin(th) * r];
    });

    let w = 0;
    let h = 0;
    let rot = 2 * DEG; // longitude facing the viewer, start on the UK
    const tilt = 28 * DEG;
    let vel = 0;
    let dragging = false;
    let lastX = 0;
    let idleSince = 0;
    let hover: string | null = null;
    let pointer: { x: number; y: number } | null = null;
    let raf = 0;
    let visible = false;
    let t0 = performance.now();

    const resize = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Rotate by longitude, then tilt about the x axis.
    const project = (v: Vec, R: number, cx: number, cy: number) => {
      const c = Math.cos(rot);
      const s = Math.sin(rot);
      const x = v[0] * c + v[2] * s;
      const z0 = -v[0] * s + v[2] * c;
      const y = v[1] * Math.cos(tilt) - z0 * Math.sin(tilt);
      const z = v[1] * Math.sin(tilt) + z0 * Math.cos(tilt);
      return { x: cx + x * R, y: cy - y * R, z };
    };

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - t0) / 1000);
      t0 = now;
      const { markers, origin, active, color, accent } = state.current;
      if (!dragging) {
        if (now - idleSince > 1200 && !reduced) vel += (0.12 - vel) * 0.02;
        else vel *= 0.94;
        rot += vel * dt;
      }
      const R = Math.min(w, h) * 0.42;
      const cx = w / 2;
      const cy = h / 2;
      ctx.clearRect(0, 0, w, h);

      // Halo
      const halo = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R * 1.25);
      halo.addColorStop(0, `${color}22`);
      halo.addColorStop(1, `${color}00`);
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      // Dot sphere: back dots dim, front dots brighter
      for (const d of dots) {
        const p = project(d, R, cx, cy);
        const a = p.z > 0 ? 0.18 + p.z * 0.4 : 0.05;
        ctx.fillStyle = `rgba(200, 214, 240, ${a})`;
        ctx.fillRect(p.x - 0.8, p.y - 0.8, p.z > 0 ? 1.7 : 1.1, p.z > 0 ? 1.7 : 1.1);
      }

      const from = markers.find((m) => m.id === origin);
      const maxW = Math.max(...markers.map((m) => m.weight), 1e-9);
      const t = now / 1000;
      const screen: { m: GlobeMarker; x: number; y: number; r: number; front: boolean }[] = [];

      // Arcs from the origin, lifted off the surface, with a travelling light
      if (from) {
        const a = toVec(from.lat, from.lon);
        markers.forEach((m, i) => {
          if (m.id === origin) return;
          const b = toVec(m.lat, m.lon);
          const lit = m.id === active || m.id === hover;
          const steps = 40;
          const pts = [];
          for (let k = 0; k <= steps; k++) {
            const u = k / steps;
            const v = slerp(a, b, u);
            const lift = 1 + Math.sin(u * Math.PI) * (0.08 + 0.16 * Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])) / Math.PI);
            pts.push(project([v[0] * lift, v[1] * lift, v[2] * lift], R, cx, cy));
          }
          ctx.lineWidth = lit ? 1.6 : 0.8;
          ctx.strokeStyle = lit ? accent : `${color}55`;
          ctx.beginPath();
          let pen = false;
          for (const p of pts) {
            if (p.z < -0.15) {
              pen = false;
              continue;
            }
            if (pen) ctx.lineTo(p.x, p.y);
            else ctx.moveTo(p.x, p.y);
            pen = true;
          }
          ctx.stroke();
          const u = (t * 0.35 + i * 0.137) % 1;
          const p = pts[Math.round(u * steps)];
          if (p.z > -0.15) {
            ctx.fillStyle = lit ? accent : color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, lit ? 2.4 : 1.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        });
      }

      // Markers, sized by share of revenue (area ∝ weight)
      for (const m of markers) {
        const p = project(toVec(m.lat, m.lon), R, cx, cy);
        const r = 2.2 + 14 * Math.sqrt(m.weight / maxW);
        screen.push({ m, x: p.x, y: p.y, r, front: p.z > 0 });
        if (p.z <= 0) continue;
        const lit = m.id === active || m.id === hover;
        const pulse = (t * 0.8 + m.lat * 0.01) % 1;
        ctx.strokeStyle = `${lit ? accent : color}${Math.round((1 - pulse) * 160)
          .toString(16)
          .padStart(2, "0")}`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + pulse * 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = lit ? accent : `${color}cc`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(2, r * 0.55), 0, Math.PI * 2);
        ctx.fill();
      }

      // Hover: nearest front marker under the pointer
      let next: string | null = null;
      if (pointer) {
        let best = 18;
        for (const s of screen) {
          if (!s.front) continue;
          const d = Math.hypot(s.x - pointer.x, s.y - pointer.y) - s.r * 0.5;
          if (d < best) {
            best = d;
            next = s.m.id;
          }
        }
      }
      if (next !== hover) {
        hover = next;
        state.current.onHover?.(hover);
        canvas.style.cursor = hover ? "pointer" : "grab";
      }

      // Labels for the origin, the highlighted marker and the biggest few in front
      const labelled = screen
        .filter((s) => s.front)
        .sort((a, b) => b.m.weight - a.m.weight)
        .filter((s, i) => i < 5 || s.m.id === active || s.m.id === hover);
      ctx.font = `500 11px ${mono}`;
      ctx.textBaseline = "middle";
      // Highlighted label first, then skip any label that would overlap one already drawn
      const isLit = (s: (typeof screen)[number]) => s.m.id === active || s.m.id === hover;
      labelled.sort((a, b) => Number(isLit(b)) - Number(isLit(a)));
      const boxes: { x: number; y: number; w: number }[] = [];
      for (const s of labelled) {
        const lit = isLit(s);
        const x = s.x + s.r * 0.55 + 6;
        const lw = ctx.measureText(s.m.label).width;
        if (boxes.some((b) => Math.abs(b.y - s.y) < 13 && x < b.x + b.w + 6 && b.x < x + lw + 6)) continue;
        boxes.push({ x, y: s.y, w: lw });
        ctx.fillStyle = lit ? "#ffffff" : "rgba(243,241,234,0.7)";
        ctx.fillText(s.m.label, x, s.y);
      }

      raf = visible ? requestAnimationFrame(draw) : 0;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) {
        t0 = performance.now();
        raf = requestAnimationFrame(draw);
      }
    });
    io.observe(canvas);

    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      vel = 0;
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      pointer = local(e);
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      rot += dx * 0.006;
      vel = dx * 0.35;
      idleSince = performance.now();
    };
    const up = () => {
      dragging = false;
      idleSince = performance.now();
    };
    const leave = () => {
      pointer = null;
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("pointerleave", leave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Globe with an arc from the United Kingdom to every country that ordered. Drag to rotate."
      className={cn("h-full w-full cursor-grab touch-pan-y", className)}
    />
  );
}
