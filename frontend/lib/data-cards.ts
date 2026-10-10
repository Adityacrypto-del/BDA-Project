"use client";

import { useEffect, useState } from "react";

/* Paints a MapReduce output record onto a canvas and returns it as an image URL,
 * so the image-based components (the stream corridor and the glass carousel)
 * show real results instead of stock photos. */

export type CardSpec = {
  /** Small mono line at the top, e.g. "sales_by_product · #01". */
  kicker: string;
  title: string;
  value: string;
  /** 0–1, drawn as a bar under the value. */
  share: number;
  shareLabel: string;
  /** The raw reducer line, shown at the bottom. */
  raw: string;
  /** Categorical colour slot, 1–5. */
  slot: number;
};

const SLOTS = ["#5b9bff", "#2fc7a9", "#f0b23f", "#a98bff", "#ef739f"];

function fontVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "…";
  }
  return lines;
}

export function renderCard(spec: CardSpec, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext("2d")!;
  const color = SLOTS[(spec.slot - 1) % SLOTS.length];
  const sans = fontVar("--font-geist", "sans-serif");
  const display = fontVar("--font-bodoni", "serif");
  const mono = fontVar("--font-jetbrains", "monospace");
  const u = width / 100; // layout unit: 1% of the card width

  // Background: dark card with a glow in the series colour
  const bg = c.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#0f121b");
  bg.addColorStop(1, "#07080c");
  c.fillStyle = bg;
  c.fillRect(0, 0, width, height);
  const glow = c.createRadialGradient(width * 0.85, height * 0.12, 0, width * 0.85, height * 0.12, width * 0.95);
  glow.addColorStop(0, `${color}55`);
  glow.addColorStop(1, `${color}00`);
  c.fillStyle = glow;
  c.fillRect(0, 0, width, height);

  // Faint grid
  c.strokeStyle = "rgba(255,255,255,0.05)";
  c.lineWidth = 1;
  for (let x = 0; x <= width; x += 10 * u) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, height);
    c.stroke();
  }
  for (let y = 0; y <= height; y += 10 * u) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(width, y);
    c.stroke();
  }

  const pad = 8 * u;
  c.textBaseline = "alphabetic";

  // Kicker
  c.fillStyle = color;
  c.font = `500 ${3.6 * u}px ${mono}`;
  c.fillText(spec.kicker.toUpperCase(), pad, pad + 3 * u);

  // Title
  c.fillStyle = "#f3f1ea";
  c.font = `400 ${9.5 * u}px ${display}`;
  const lines = wrap(c, spec.title, width - pad * 2, 4);
  lines.forEach((l, i) => c.fillText(l, pad, pad + 18 * u + i * 10.5 * u));

  // Value
  const valueY = height - pad - 26 * u;
  c.font = `600 ${13 * u}px ${sans}`;
  c.fillStyle = "#ffffff";
  c.fillText(spec.value, pad, valueY);

  // Share bar
  const barY = valueY + 6 * u;
  const barW = width - pad * 2;
  c.fillStyle = "rgba(255,255,255,0.09)";
  c.beginPath();
  c.roundRect(pad, barY, barW, 1.6 * u, 0.8 * u);
  c.fill();
  c.fillStyle = color;
  c.beginPath();
  c.roundRect(pad, barY, Math.max(2 * u, barW * Math.min(1, spec.share)), 1.6 * u, 0.8 * u);
  c.fill();
  c.fillStyle = "rgba(243,241,234,0.6)";
  c.font = `400 ${3.6 * u}px ${sans}`;
  c.fillText(spec.shareLabel, pad, barY + 8 * u);

  // Raw reducer line
  c.fillStyle = "rgba(243,241,234,0.4)";
  c.font = `400 ${3.1 * u}px ${mono}`;
  const raw = wrap(c, spec.raw, width - pad * 2, 1)[0] ?? "";
  c.fillText(raw, pad, height - pad);

  return canvas.toDataURL("image/png");
}

/** Renders the cards once fonts are loaded. Returns [] until then. */
export function useDataCards(specs: CardSpec[], width: number, height: number) {
  const key = JSON.stringify(specs);
  const [urls, setUrls] = useState<{ key: string; urls: string[] }>({ key: "", urls: [] });

  useEffect(() => {
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      const parsed: CardSpec[] = JSON.parse(key);
      setUrls({ key, urls: parsed.map((s) => renderCard(s, width, height)) });
    });
    return () => {
      cancelled = true;
    };
  }, [key, width, height]);

  return urls.key === key ? urls.urls : [];
}
