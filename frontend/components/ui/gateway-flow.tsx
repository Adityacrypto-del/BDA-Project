"use client";

/* Particle flow from frontend-bitch/02-gateway-flow, ported from its iframe
 * (which pulled Tailwind, GSAP and iconify from CDNs) to a plain canvas so it
 * can react to the page. Particles drift and converge on the centre, which is
 * what a reducer does to keys; a click sends out a ripple.
 *
 * Added on top of the original: `pull` (how hard they converge), `hue` can
 * change while it runs, `ripple()` through a ref, and it pauses off-screen. */

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils";

export type GatewayFlowHandle = { ripple: (x?: number, y?: number) => void };

export type GatewayFlowProps = {
  className?: string;
  speed?: number;
  /** Particles per 1,000 px² of canvas, roughly. */
  density?: number;
  strokeWidth?: number;
  opacity?: number;
  hue?: number;
  saturation?: number;
  brightness?: number;
  /** Strength of the pull towards the centre. The original used 0.001. */
  pull?: number;
  /** Trail fade per frame, 0–1. Lower leaves longer trails. */
  fade?: number;
  background?: string;
};

type Particle = { x: number; y: number; vx: number; vy: number };
type Ripple = { x: number; y: number; radius: number };

export const GatewayFlow = forwardRef<GatewayFlowHandle, GatewayFlowProps>(function GatewayFlow(
  {
    className,
    speed = 1,
    density = 0.5,
    strokeWidth = 1,
    opacity = 0.5,
    hue = 210,
    saturation = 100,
    brightness = 50,
    pull = 0.001,
    fade = 0.1,
    background = "7, 8, 12",
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripples = useRef<Ripple[]>([]);
  const props = useRef({ speed, strokeWidth, opacity, hue, saturation, brightness, pull, fade, background });
  useEffect(() => {
    props.current = { speed, strokeWidth, opacity, hue, saturation, brightness, pull, fade, background };
  }, [speed, strokeWidth, opacity, hue, saturation, brightness, pull, fade, background]);

  useImperativeHandle(ref, () => ({
    ripple: (x, y) => {
      const c = canvasRef.current;
      if (!c) return;
      ripples.current.push({ x: x ?? c.clientWidth / 2, y: y ?? c.clientHeight / 2, radius: 0 });
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let raf = 0;
    let visible = false;

    const spawn = (p: Particle) => {
      const s = props.current.speed;
      p.x = Math.random() * width;
      p.y = Math.random() * height;
      p.vx = (Math.random() - 0.5) * s;
      p.vy = (Math.random() - 0.5) * s;
      return p;
    };

    const resize = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(((width * height) / 1000) * density * 0.9);
      particles = Array.from({ length: Math.min(n, 2400) }, () => spawn({ x: 0, y: 0, vx: 0, vy: 0 }));
    };

    const step = () => {
      const p = props.current;
      ctx.fillStyle = `rgba(${p.background}, ${p.fade})`;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.brightness}%, ${p.opacity})`;
      for (const q of particles) {
        q.x += q.vx * p.speed + (width / 2 - q.x) * p.pull;
        q.y += q.vy * p.speed + (height / 2 - q.y) * p.pull;
        for (const r of ripples.current) {
          const dx = q.x - r.x;
          const dy = q.y - r.y;
          const dist = Math.hypot(dx, dy);
          if (dist < r.radius && dist > r.radius - 20) {
            q.x += dx * 0.05;
            q.y += dy * 0.05;
          }
        }
        if (q.x < 0 || q.x > width || q.y < 0 || q.y > height) spawn(q);
        ctx.beginPath();
        ctx.arc(q.x, q.y, p.strokeWidth, 0, Math.PI * 2);
        ctx.fill();
      }
      ripples.current = ripples.current.filter((r) => (r.radius += 5) < 500);
    };

    const loop = () => {
      step();
      raf = visible ? requestAnimationFrame(loop) : 0;
    };

    resize();
    if (reduced) for (let i = 0; i < 60; i++) step();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting && !reduced;
      if (visible && !raf) raf = requestAnimationFrame(loop);
    });
    io.observe(canvas);
    const onClick = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      ripples.current.push({ x: e.clientX - r.left, y: e.clientY - r.top, radius: 0 });
    };
    canvas.parentElement?.addEventListener("pointerdown", onClick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.parentElement?.removeEventListener("pointerdown", onClick);
    };
  }, [density]);

  return <canvas ref={canvasRef} aria-hidden className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} />;
});
