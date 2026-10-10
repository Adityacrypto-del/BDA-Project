"use client";

import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";
import type { Source } from "@/lib/use-dataset";
import { cn } from "@/lib/utils";

const LINKS = [
  ["overview", "Overview"],
  ["pipeline", "Pipeline"],
  ["monthly", "Monthly"],
  ["products", "Products"],
  ["countries", "Countries"],
  ["run", "Run"],
] as const;

export function Nav({ source }: { source: Source }) {
  const { scrollY, scrollYProgress } = useScroll();
  const [hidden, setHidden] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(y > prev && y > 200);
  });

  return (
    <motion.header
      animate={{ y: hidden ? -80 : 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/60 backdrop-blur-xl"
    >
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <a href="#top" className="font-mono text-[13px] font-semibold tracking-tight">
          retail<span className="text-primary">/</span>mapreduce
        </a>
        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map(([id, label]) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="rounded-full px-3 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
        <SourcePill source={source} />
      </nav>
      <motion.div style={{ scaleX: scrollYProgress }} className="h-px origin-left bg-primary" />
    </motion.header>
  );
}

export function SourcePill({ source }: { source: Source }) {
  const label = source === "live" ? "Live API" : source === "snapshot" ? "Offline snapshot" : "Connecting";
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 font-mono text-[11px] ring-1 ring-border"
      title={source === "snapshot" ? "Backend not reachable - showing bundled results" : undefined}
    >
      <span className="relative flex size-2">
        {source === "live" && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" />}
        <span
          className={cn(
            "relative size-2 rounded-full",
            source === "live" ? "bg-emerald-400" : source === "snapshot" ? "bg-amber-400" : "bg-muted-foreground",
          )}
        />
      </span>
      {label}
    </span>
  );
}
