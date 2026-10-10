"use client";

/* Decrypt-style text reveal, in the style of the 21st.dev "Scramble Text" and
 * "Text Scramble" components: random glyphs settle into the real string, left
 * to right, the first time it scrolls into view or whenever the text changes. */

import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/";

export function ScrambleText({
  text,
  className,
  speed = 28,
  delay = 0,
}: {
  text: string;
  className?: string;
  /** Milliseconds per frame. */
  speed?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const [out, setOut] = useState(text);

  useEffect(() => {
    if (!inView) return;
    // Reduced motion: keep the plain text it started with
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      timer = setInterval(() => {
        frame++;
        const settled = Math.floor(frame / 2);
        setOut(
          [...text]
            .map((ch, i) => (i < settled || ch === " " ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
            .join(""),
        );
        if (settled >= text.length) clearInterval(timer);
      }, speed);
    }, delay * 1000);
    return () => {
      clearTimeout(start);
      clearInterval(timer);
    };
  }, [inView, text, speed, delay]);

  return (
    <span ref={ref} className={cn("inline-block", className)} aria-label={text}>
      <span aria-hidden>{out}</span>
    </span>
  );
}
