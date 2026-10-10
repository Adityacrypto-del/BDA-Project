"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, CircleDashed, Loader2, Play, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { Reveal } from "@/components/ui/reveal";
import { API_URL, getGraphs, getPipelineStatus, runPipeline, type Graph, type PipelineStatus } from "@/lib/api";
import type { Source } from "@/lib/use-dataset";
import { cn } from "@/lib/utils";
import { Section } from "./section";

const STATUS = {
  idle: { icon: CircleDashed, label: "Idle", tone: "text-muted-foreground" },
  running: { icon: Loader2, label: "Running", tone: "text-primary" },
  succeeded: { icon: CheckCircle2, label: "Succeeded", tone: "text-emerald-400" },
  failed: { icon: XCircle, label: "Failed", tone: "text-destructive" },
} as const;

export function RunPipeline({ source, onFinished }: { source: Source; onFinished: () => void }) {
  const [mode, setMode] = useState<"local" | "hadoop">("local");
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLPreElement>(null);
  const wasRunning = useRef(false);
  const live = source === "live";

  const poll = useCallback(async () => {
    try {
      const s = await getPipelineStatus();
      setStatus(s);
      if (wasRunning.current && s.status !== "running") onFinished();
      wasRunning.current = s.status === "running";
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [onFinished]);

  useEffect(() => {
    if (!live) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync with the backend
    poll();
    const t = setInterval(poll, status?.status === "running" ? 1500 : 6000);
    return () => clearInterval(t);
  }, [live, poll, status?.status]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [status?.log_tail.length]);

  const start = async () => {
    setError(null);
    try {
      setStatus(await runPipeline(mode));
      wasRunning.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const s = STATUS[status?.status ?? "idle"];
  const Icon = s.icon;
  const running = status?.status === "running";

  return (
    <Section
      id="run"
      eyebrow="06 · Run it"
      title={<>Re-run the whole pipeline from here.</>}
      lede={
        <>
          Sends <code className="font-mono text-[13px] text-foreground">POST /api/pipeline/run</code> to the backend, which runs{" "}
          <code className="font-mono text-[13px] text-foreground">run_pipeline.sh</code> (clean → MapReduce → verify → graphs) and streams its log back. Hadoop mode needs the
          cluster to be running (<code className="font-mono text-[13px] text-foreground">scripts/hadoop_start.sh</code>).
        </>
      }
    >
      <Reveal>
        <div className="overflow-hidden rounded-[18px] bg-card ring-1 ring-border">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <div className="flex flex-wrap items-center gap-3">
              <AnimatedTabs
                value={mode}
                onChange={setMode}
                tabs={[
                  { value: "local", label: "Local simulation" },
                  { value: "hadoop", label: "Hadoop (HDFS + YARN)" },
                ]}
              />
              <button
                onClick={start}
                disabled={!live || running}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-foreground px-5 text-[13px] font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                {running ? "Running…" : "Run pipeline"}
              </button>
            </div>
            <span className={cn("inline-flex items-center gap-2 font-mono text-[12px]", s.tone)}>
              <Icon className={cn("size-4", running && "animate-spin")} />
              {s.label}
              {status?.mode && <span className="text-muted-foreground">· {status.mode}</span>}
            </span>
          </div>

          <pre
            ref={logRef}
            className="h-72 overflow-auto bg-[#05060a] p-4 font-mono text-[12px] leading-relaxed text-[#b9c2d6]"
          >
            {!live && (
              <span className="text-amber-300">
                Backend not reachable at {API_URL}. Start it with:{"\n"}  uvicorn backend.main:app --port 8000{"\n"}
              </span>
            )}
            {live && !status?.log_tail.length && <span className="text-muted-foreground">$ waiting for a run…</span>}
            <AnimatePresence initial={false}>
              {status?.log_tail.map((line, i) => (
                <motion.span key={`${i}-${line}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="block">
                  {line || " "}
                </motion.span>
              ))}
            </AnimatePresence>
            {running && <span className="caret">▍</span>}
          </pre>
          {error && <p className="border-t border-border px-4 py-2 text-[12px] text-destructive">{error}</p>}
        </div>
      </Reveal>
    </Section>
  );
}

export function Graphs({ source, version }: { source: Source; version: string | null }) {
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [open, setOpen] = useState<Graph | null>(null);

  useEffect(() => {
    if (source !== "live") return;
    getGraphs().then(setGraphs).catch(() => setGraphs([]));
  }, [source, version]);

  if (!graphs.length) return null;
  const src = (g: Graph) => `${API_URL}${g.url}?v=${encodeURIComponent(version ?? "")}`;

  return (
    <Section
      id="graphs"
      eyebrow="07 · Matplotlib output"
      title={<>The charts from scripts/visualize.py.</>}
      lede="Served from results/graphs by the backend. Click a chart to enlarge it."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {graphs.map((g, i) => (
          <Reveal key={g.name} delay={i * 0.06}>
            <motion.button
              whileHover={{ y: -4 }}
              onClick={() => setOpen(g)}
              className="block w-full overflow-hidden rounded-[16px] bg-white ring-1 ring-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- served by the API, not by Next */}
              <img src={src(g)} alt={g.name.replace(/^\d+_/, "").replace(/_/g, " ")} className="w-full" loading="lazy" />
            </motion.button>
          </Reveal>
        ))}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
          >
            <motion.img
              src={src(open)}
              alt={open.name}
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.92 }}
              className="max-h-[90vh] max-w-[95vw] rounded-[12px] bg-white"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Section>
  );
}
