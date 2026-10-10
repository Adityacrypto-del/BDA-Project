"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, CircleDashed, Loader2, Play, XCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { GatewayFlow, type GatewayFlowHandle } from "@/components/ui/gateway-flow";
import { Magnetic } from "@/components/ui/magnetic";
import { Reveal } from "@/components/ui/reveal";
import { API_URL, getGraphs, getPipelineStatus, runPipeline, type Graph, type PipelineStatus } from "@/lib/api";
import type { Source } from "@/lib/use-dataset";
import { cn } from "@/lib/utils";
import { Section } from "./section";

// frontend-bitch/07-morph-gallery: WebGL, client only
const MorphGallery = dynamic(() => import("@/components/ui/morph-gallery"), {
  ssr: false,
});

const STATUS = {
  idle: { icon: CircleDashed, label: "Idle", tone: "text-muted-foreground" },
  running: { icon: Loader2, label: "Running", tone: "text-primary" },
  succeeded: {
    icon: CheckCircle2,
    label: "Succeeded",
    tone: "text-emerald-400",
  },
  failed: { icon: XCircle, label: "Failed", tone: "text-destructive" },
} as const;

export function RunPipeline({ source, onFinished }: { source: Source; onFinished: () => void }) {
  const [mode, setMode] = useState<"local" | "hadoop">("local");
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLPreElement>(null);
  const flow = useRef<GatewayFlowHandle>(null);
  const wasRunning = useRef(false);
  const live = source === "live";

  const poll = useCallback(async () => {
    try {
      const s = await getPipelineStatus();
      setStatus(s);
      if (wasRunning.current && s.status !== "running") {
        flow.current?.ripple();
        onFinished();
      }
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
    logRef.current?.scrollTo({
      top: logRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [status?.log_tail.length]);

  const start = async () => {
    setError(null);
    flow.current?.ripple();
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
          <code className="font-mono text-[13px] text-foreground">run_pipeline.sh</code> (clean → MapReduce → verify → graphs) and streams its log back. Hadoop
          mode needs the cluster to be running (<code className="font-mono text-[13px] text-foreground">scripts/hadoop_start.sh</code>
          ).
        </>
      }
    >
      <Reveal>
        <div className="relative overflow-hidden rounded-[22px] p-3 ring-1 ring-border sm:p-10">
          {/* Particles converge like keys on a reducer; faster and warmer while a job runs */}
          <GatewayFlow
            ref={flow}
            speed={running ? 2.6 : 0.9}
            pull={running ? 0.004 : 0.0012}
            hue={status?.status === "failed" ? 350 : running ? 168 : 216}
            saturation={80}
            brightness={62}
            opacity={0.55}
            density={0.45}
          />
          <div className="relative overflow-hidden rounded-[18px] bg-card/85 ring-1 ring-border backdrop-blur-md">
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
                <Magnetic>
                  <button
                    onClick={start}
                    disabled={!live || running}
                    className="inline-flex h-9 items-center gap-2 rounded-full bg-foreground px-5 text-[13px] font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                    {running ? "Running…" : "Run pipeline"}
                  </button>
                </Magnetic>
              </div>
              <span className={cn("inline-flex items-center gap-2 font-mono text-[12px]", s.tone)}>
                <Icon className={cn("size-4", running && "animate-spin")} />
                {s.label}
                {status?.mode && <span className="text-muted-foreground">· {status.mode}</span>}
              </span>
            </div>

            <pre ref={logRef} className="h-72 overflow-auto bg-[#05060a]/90 p-4 font-mono text-[12px] leading-relaxed text-[#b9c2d6]">
              {!live && (
                <span className="text-amber-300">
                  Backend not reachable at {API_URL}. Start it with:{"\n"} uvicorn backend.main:app --port 8000{"\n"}
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
        </div>
      </Reveal>
    </Section>
  );
}

const OFFLINE_GRAPHS: Graph[] = ["1_sales_by_product", "2_sales_by_country", "3_top_selling_products", "4_monthly_sales"].map((name) => ({
  name,
  url: `/graphs/${name}.png`,
}));

const BOX = { w: 1650, h: 1006 };
const label = (g: Graph) => g.name.replace(/^\d+_/, "").replace(/_/g, " ");

/** Letterboxes every chart onto one white frame, so the gallery's cover fit never crops an axis. */
function useFramed(srcs: string[]) {
  const [out, setOut] = useState<string[]>([]);
  const key = srcs.join("|");
  useEffect(() => {
    let alive = true;
    Promise.all(
      srcs.map(
        (src) =>
          new Promise<string>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              const c = document.createElement("canvas");
              c.width = BOX.w;
              c.height = BOX.h;
              const ctx = c.getContext("2d")!;
              // Fill with the chart's own paper colour, read from its top-left pixel
              ctx.drawImage(img, 0, 0, 1, 1, 0, 0, 1, 1);
              let paper = "#ffffff";
              try {
                const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
                paper = `rgb(${r}, ${g}, ${b})`;
              } catch {}
              ctx.fillStyle = paper;
              ctx.fillRect(0, 0, BOX.w, BOX.h);
              const k = Math.min(BOX.w / img.width, BOX.h / img.height);
              const w = img.width * k;
              const h = img.height * k;
              ctx.drawImage(img, (BOX.w - w) / 2, (BOX.h - h) / 2, w, h);
              try {
                resolve(c.toDataURL("image/png"));
              } catch {
                resolve(src);
              }
            };
            img.onerror = () => resolve(src);
            img.src = src;
          }),
      ),
    ).then((r) => alive && setOut(r));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the joined list
  }, [key]);
  return out;
}

export function Graphs({ source, version }: { source: Source; version: string | null }) {
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (source !== "live") return;
    getGraphs()
      .then(setGraphs)
      .catch(() => setGraphs([]));
  }, [source, version]);

  const live = source === "live" && graphs.length > 0;
  const list = live ? graphs : OFFLINE_GRAPHS;
  const srcs = useMemo(() => list.map((g) => (live ? `${API_URL}${g.url}?v=${encodeURIComponent(version ?? "")}` : g.url)), [list, live, version]);
  const framed = useFramed(srcs);
  const items = useMemo(() => framed.map((src, i) => ({ src, alt: label(list[i]) })), [framed, list]);

  return (
    <Section
      id="graphs"
      eyebrow="07 · Matplotlib output"
      title={<>The charts from scripts/visualize.py.</>}
      lede={`${live ? "Served from results/graphs by the backend" : "Bundled copies of results/graphs (the backend is offline)"}. Each one dissolves into the next; use the arrows or thumbnails to pick one.`}
    >
      <Reveal>
        <div className="overflow-hidden rounded-[18px] bg-white ring-1 ring-border">
          {items.length > 0 ? (
            <MorphGallery
              items={items}
              height="calc(min(100vw - 2rem, 70rem) / 1.64)"
              autoplay={5200}
              duration={1600}
              index={index}
              onIndexChange={setIndex}
              thumbnails={false}
            />
          ) : (
            <div style={{ height: "calc(min(100vw - 2rem, 70rem) / 1.64)" }} />
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {list.map((g, i) => (
            <button
              key={g.name}
              onClick={() => setIndex(i)}
              className={cn(
                "rounded-full px-3 py-1.5 font-mono text-[11.5px] ring-1 ring-border transition-colors",
                i === index ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {String(i + 1).padStart(2, "0")} · {label(g)}
            </button>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}
