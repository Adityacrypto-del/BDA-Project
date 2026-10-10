"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MachineMode, StationId } from "@/components/ui/agentic-factory-3d";
import { cn } from "@/lib/utils";

/* The procedural machine from frontend-bitch/04-agentic-factory-3d, relabelled
 * as a MapReduce job. The scene only loads once it's near the screen, and it
 * pauses while it's off-screen. */
const AgenticFactory3D = dynamic(() => import("@/components/ui/agentic-factory-3d"), { ssr: false });

export const STATIONS: {
  id: StationId;
  name: string;
  stage: string;
  text: string;
}[] = [
  {
    id: "cabinet",
    name: "HDFS",
    stage: "HDFS",
    text: "519,516 cleaned lines in 44.6 MB, cut into input splits.",
  },
  {
    id: "engine",
    name: "Map",
    stage: "Map",
    text: "One mapper per split emits a key and a value for every line.",
  },
  {
    id: "admin",
    name: "Shuffle",
    stage: "Combine + shuffle",
    text: "Combiners sum on the map side, then keys are sorted and sent to the reducer.",
  },
  {
    id: "storefront",
    name: "Reduce",
    stage: "Reduce",
    text: "The reducer adds up every value for one key and writes the total.",
  },
  {
    id: "cashdesk",
    name: "Output",
    stage: "Reduce",
    text: "part-00000 lands on HDFS and the API turns it into JSON.",
  },
];

const MODES: { value: MachineMode; label: string }[] = [
  { value: "assembled", label: "Assembled" },
  { value: "cutaway", label: "Cutaway" },
  { value: "stations", label: "Stations" },
  { value: "order", label: "Trace a record" },
];

export function Factory({ onStage }: { onStage?: (stage: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const near = useInView(ref, { once: true, margin: "300px 0px" });
  const inView = useInView(ref, { margin: "0px 0px" });
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<MachineMode>("assembled");
  const [station, setStation] = useState<StationId | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (inView) window.__machine?.play();
    else window.__machine?.pause();
  }, [inView, ready]);

  const pick = useCallback(
    (id: StationId) => {
      setStation(id);
      onStage?.(STATIONS.find((s) => s.id === id)?.stage ?? null);
    },
    [onStage],
  );

  const choose = (m: MachineMode) => {
    setMode(m);
    setStation(null);
    onStage?.(null);
    window.__machine?.setMode(m);
    if (m !== "order") window.__machine?.setCamera("overview");
  };

  const focus = (id: StationId) => {
    window.__machine?.focusStation(id);
    pick(id);
  };

  const s = STATIONS.find((x) => x.id === station);

  return (
    <div ref={ref} className="relative h-[78vh] min-h-[560px] overflow-hidden rounded-[22px] bg-background ring-1 ring-border">
      {near && <AgenticFactory3D embed height="100%" onStation={pick} onReady={() => setReady(true)} />}
      {!ready && <div className="absolute inset-0 grid place-content-center font-mono text-[12px] text-muted-foreground">Building the cluster…</div>}

      <div className="pointer-events-none absolute inset-x-4 bottom-4 flex flex-col gap-3 sm:inset-x-6 sm:bottom-6 lg:top-6 lg:right-auto lg:w-[340px] lg:justify-between">
        <div className="pointer-events-auto hidden rounded-[16px] bg-card/70 p-5 ring-1 ring-border backdrop-blur-md lg:block">
          <p className="font-mono text-[11px] tracking-[0.2em] text-primary uppercase">Inside one job</p>
          <AnimatePresence mode="wait">
            <motion.div
              key={s?.id ?? "intro"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <p className="mt-3 font-display text-[30px] leading-none">{s ? s.name : "Five stations"}</p>
              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                {s ? s.text : "Every order line passes the same five stations. Drag to orbit, click a station, or trace a single record through the machine."}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="pointer-events-auto grid gap-2 rounded-[16px] bg-card/70 p-3 ring-1 ring-border backdrop-blur-md">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Machine view">
            {MODES.map((m) => (
              <Chip key={m.value} on={mode === m.value && !station} onClick={() => choose(m.value)}>
                {m.label}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Stations">
            {STATIONS.map((x, i) => (
              <Chip key={x.id} on={station === x.id} onClick={() => focus(x.id)} accent>
                <span className="opacity-55">{i + 1}</span> {x.name}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ on, accent, onClick, children }: { on: boolean; accent?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "relative rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
        on ? "text-background" : "text-foreground/80 hover:bg-accent",
      )}
    >
      {on && (
        <motion.span
          layoutId={accent ? "station-chip" : "mode-chip"}
          className={cn("absolute inset-0 -z-0 rounded-full", accent ? "bg-chart-2" : "bg-foreground")}
          transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
        />
      )}
      <span className="relative">{children}</span>
    </button>
  );
}
