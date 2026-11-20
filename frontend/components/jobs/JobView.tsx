"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Database,
  Pause,
  Play,
  RotateCcw,
  Terminal,
} from "lucide-react";
import ExecutionGraph from "./ExecutionGraph";
import StagePanel from "./StagePanel";
import DependencyGraph from "./DependencyGraph";
import { useDataset } from "@/lib/use-dataset";
import { count, countryName, moneyFull, monthShort } from "@/lib/api";
import { JOBS, STAGES, getJob, hadoopCommand, traceJob, type JobSlug, type StageId } from "@/lib/mr-jobs";

const ease = [0.16, 1, 0.3, 1] as const;
const STEP_MS = 3200;

function SectionHeading({ eyebrow, title, italic }: { eyebrow: string; title: string; italic: string }) {
  return (
    <div className="mb-8 md:mb-10">
      <p className="text-white/40 text-xs tracking-widest uppercase mb-3 font-medium">{eyebrow}</p>
      <h2 className="text-3xl md:text-5xl text-white tracking-tight font-normal">
        {title}{" "}
        <span className="italic text-white/45 font-instrument" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>
          {italic}
        </span>
      </h2>
    </div>
  );
}

/* Tiny Python highlighter: docstrings and comments dim, keywords bright. */
const KW = /\b(def|import|for|in|if|else|elif|return|try|except|continue|not|is|None|while|from|as)\b/g;
function CodeBlock({ title, code, accent }: { title: string; code: string; accent: string }) {
  const lines = code.replace(/\n$/, "").split("\n");
  // Which lines belong to a """docstring""" (computed up front, not during render).
  const docFlags = lines.reduce<{ flags: boolean[]; open: boolean }>(
    (acc, line) => {
      const n = (line.match(/"""/g) ?? []).length;
      acc.flags.push(acc.open || n > 0);
      if (n % 2 === 1) acc.open = !acc.open;
      return acc;
    },
    { flags: [], open: false },
  ).flags;
  return (
    <div className="liquid-glass rounded-3xl border border-white/10 overflow-hidden min-w-0">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10">
        <span className="w-2 h-2 rounded-full" style={{ background: accent }} />
        <span className="font-mono text-xs text-white/70">{title}</span>
      </div>
      <pre className="p-5 text-[12px] leading-relaxed font-mono overflow-x-auto">
        {lines.map((line, i) => {
          const docLine = docFlags[i];
          let body: React.ReactNode;
          if (docLine) body = <span className="text-white/35">{line}</span>;
          else {
            const hash = line.indexOf("#");
            const codePart = hash >= 0 ? line.slice(0, hash) : line;
            const comment = hash >= 0 ? line.slice(hash) : "";
            const parts = codePart.split(KW);
            body = (
              <>
                {parts.map((p, j) =>
                  j % 2 === 1 ? (
                    <span key={j} style={{ color: accent }}>
                      {p}
                    </span>
                  ) : (
                    <span key={j} className="text-white/80">
                      {p}
                    </span>
                  ),
                )}
                {comment && <span className="text-white/35">{comment}</span>}
              </>
            );
          }
          return (
            <div key={i} className="flex">
              <span className="w-8 shrink-0 text-right pr-4 text-white/20 select-none">{i + 1}</span>
              <span className="whitespace-pre">{body}</span>
            </div>
          );
        })}
      </pre>
    </div>
  );
}

export default function JobView({
  slug,
  mapperCode,
  reducerCode,
}: {
  slug: JobSlug;
  mapperCode: string;
  reducerCode: string;
}) {
  const job = getJob(slug)!;
  const trace = useMemo(() => traceJob(job), [job]);
  const { data, source } = useDataset();
  const [stageIdx, setStageIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const stage: StageId = STAGES[stageIdx].id;
  const c = job.counters;

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (stageIdx >= STAGES.length - 1) setPlaying(false);
      else setStageIdx(stageIdx + 1);
    }, STEP_MS);
    return () => clearTimeout(t);
  }, [playing, stageIdx]);

  const selectStage = (s: StageId) => {
    setPlaying(false);
    setStageIdx(STAGES.findIndex((x) => x.id === s));
  };

  const idx = JOBS.findIndex((j) => j.slug === job.slug);
  const prev = JOBS[(idx + JOBS.length - 1) % JOBS.length];
  const next = JOBS[(idx + 1) % JOBS.length];

  /* Full job output from the API (or bundled snapshot). */
  const results: { label: string; value: number; display: string }[] = (() => {
    switch (job.slug) {
      case "sales_by_product":
        return data.productsRevenue.map((p) => ({ label: p.product, value: p.revenue, display: moneyFull(p.revenue) }));
      case "sales_by_country":
        return data.countries
          .slice(0, 10)
          .map((x) => ({ label: countryName(x.country), value: x.revenue, display: `${moneyFull(x.revenue)} · ${x.share_pct}%` }));
      case "top_selling_products":
        return data.productsQuantity.map((p) => ({ label: p.product, value: p.units_sold, display: `${count(p.units_sold)} units` }));
      case "monthly_sales":
        return data.monthly.map((m) => ({ label: monthShort(m.month), value: m.revenue, display: moneyFull(m.revenue) }));
    }
  })();
  const maxResult = Math.max(...results.map((r) => r.value), 1);

  const funnel = [
    { label: "Map input records", value: c.mapInputRecords, note: "rows read from HDFS" },
    { label: "Map output records", value: c.mapOutputRecords, note: "one pair per row" },
    { label: "Combine output (shuffled)", value: c.combineOutputRecords, note: "sent over the network" },
    { label: "Reduce output records", value: c.reduceOutputRecords, note: "lines in part-00000" },
  ];
  const logMax = Math.log10(c.mapInputRecords);

  return (
    <div className="bg-black text-white min-h-screen selection:bg-white/20">
      {/* soft accent glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-[520px] opacity-40"
        style={{ background: `radial-gradient(60% 60% at 50% 0%, ${job.accent}22 0%, transparent 70%)` }}
      />

      {/* NAV */}
      <header className="sticky top-0 z-30 px-4 md:px-6 py-4">
        <nav className="liquid-glass rounded-full max-w-6xl mx-auto px-4 md:px-6 py-2.5 flex items-center justify-between gap-3 border border-white/10 bg-black/40">
          <Link href="/#jobs" className="flex items-center gap-2 text-white/80 hover:text-white text-sm shrink-0">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {JOBS.map((j) => {
              const active = j.slug === job.slug;
              return (
                <Link
                  key={j.slug}
                  href={`/jobs/${j.slug}`}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs md:text-sm transition-colors ${
                    active ? "bg-white text-black font-medium" : "text-white/60 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <span className="font-mono mr-1 opacity-60">{j.number}</span>
                  <span className="hidden md:inline">{j.title}</span>
                </Link>
              );
            })}
          </div>
          <Link href="/" className="hidden sm:flex items-center gap-2 shrink-0">
            <div className="liquid-glass rounded-full p-1.5">
              <Database className="w-4 h-4" />
            </div>
            <span className="font-semibold tracking-tight">RetailMR</span>
          </Link>
        </nav>
      </header>

      <main className="relative max-w-6xl mx-auto px-4 md:px-6 pb-24">
        {/* HERO */}
        <section className="pt-10 md:pt-16 pb-12 md:pb-16">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full liquid-glass border border-white/10 text-xs font-mono text-white/70 mb-6">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: job.accent }} />
              MapReduce Job {job.number} · {c.appId}
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-8xl tracking-tight font-instrument" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>
              {job.title.split(" ").slice(0, -1).join(" ")} <em className="italic text-white/60">{job.title.split(" ").slice(-1)}</em>.
            </h1>
            <p className="text-white/70 text-lg md:text-xl mt-5 max-w-2xl">{job.question}</p>

            <div className="mt-8 flex flex-wrap items-center gap-3 font-mono text-sm">
              <span className="liquid-glass border border-white/10 rounded-full px-4 py-2 text-sky-300">key = {job.keyLabel}</span>
              <ArrowRight className="w-4 h-4 text-white/30" />
              <span className="liquid-glass border border-white/10 rounded-full px-4 py-2" style={{ color: job.accent }}>
                value = {job.valueLabel}
              </span>
              <ArrowRight className="w-4 h-4 text-white/30" />
              <span className="liquid-glass border border-white/10 rounded-full px-4 py-2 text-emerald-300">reduce = sum(values)</span>
            </div>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease }}
            className="mt-12 grid grid-cols-2 md:grid-cols-5 gap-3"
          >
            {[
              { k: "Input records", v: count(c.mapInputRecords) },
              { k: "Map tasks", v: String(c.mapTasks) },
              { k: "Shuffled records", v: count(c.reduceInputRecords) },
              { k: "Output keys", v: count(c.reduceOutputRecords) },
              { k: "Wall time", v: `${c.wallSeconds} s` },
            ].map((s) => (
              <div key={s.k} className="liquid-glass rounded-2xl border border-white/10 px-5 py-4">
                <dt className="text-white/40 text-[11px] uppercase tracking-widest">{s.k}</dt>
                <dd className="text-2xl md:text-3xl mt-1 tracking-tight">{s.v}</dd>
              </div>
            ))}
          </motion.dl>
        </section>

        {/* EXECUTION GRAPH */}
        <section className="py-10 md:py-14">
          <SectionHeading eyebrow="How the job runs" title="Execution" italic="graph" />
          <div className="liquid-glass rounded-3xl border border-white/10 p-4 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!playing && stageIdx === STAGES.length - 1) setStageIdx(0);
                    setPlaying((p) => !p);
                  }}
                  className="bg-white text-black rounded-full pl-3 pr-4 py-2 text-sm font-medium flex items-center gap-1.5 hover:bg-white/90 active:scale-95 transition"
                >
                  {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {playing ? "Pause" : "Play the job"}
                </button>
                <button
                  type="button"
                  aria-label="Previous stage"
                  onClick={() => selectStage(STAGES[Math.max(0, stageIdx - 1)].id)}
                  className="liquid-glass rounded-full p-2 border border-white/10 hover:bg-white/10"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next stage"
                  onClick={() => selectStage(STAGES[Math.min(STAGES.length - 1, stageIdx + 1)].id)}
                  className="liquid-glass rounded-full p-2 border border-white/10 hover:bg-white/10"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Restart"
                  onClick={() => selectStage("input")}
                  className="liquid-glass rounded-full p-2 border border-white/10 hover:bg-white/10"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
              <p className="text-white/40 text-xs">Click any box, or press play to step through the stages.</p>
            </div>

            {/* stage progress */}
            <div className="grid grid-cols-7 gap-1.5 mb-4">
              {STAGES.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectStage(s.id)}
                  className="text-left group"
                  aria-current={i === stageIdx ? "step" : undefined}
                >
                  <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: job.accent }}
                      initial={false}
                      animate={{ width: i < stageIdx ? "100%" : i === stageIdx ? (playing ? "100%" : "50%") : "0%" }}
                      transition={{ duration: i === stageIdx && playing ? STEP_MS / 1000 : 0.3, ease: "linear" }}
                    />
                  </div>
                  <span
                    className={`hidden sm:block mt-1.5 text-[11px] truncate ${
                      i === stageIdx ? "text-white" : "text-white/35 group-hover:text-white/60"
                    }`}
                  >
                    {s.short}
                  </span>
                </button>
              ))}
            </div>

            <ExecutionGraph job={job} active={stage} onSelect={selectStage} />
            <p className="text-white/35 text-[11px] mt-2">
              Line thickness follows the number of records on that link (log scale): the combiner is where it thins out.
            </p>
          </div>

          <div className="mt-6">
            <StagePanel job={job} stage={stage} trace={trace} />
          </div>
        </section>

        {/* COMBINER FUNNEL */}
        <section className="py-10 md:py-14">
          <SectionHeading eyebrow="Why the combiner matters" title="Records at each" italic="step" />
          <div className="liquid-glass rounded-3xl border border-white/10 p-6 md:p-8 space-y-5">
            {funnel.map((f, i) => {
              const w = Math.max(2, (100 * Math.log10(Math.max(f.value, 1))) / logMax);
              return (
                <div key={f.label}>
                  <div className="flex items-baseline justify-between gap-4 mb-1.5">
                    <span className="text-sm text-white/80">
                      {f.label} <span className="text-white/35 text-xs">· {f.note}</span>
                    </span>
                    <span className="font-mono text-sm">{count(f.value)}</span>
                  </div>
                  <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: i >= 2 ? job.accent : "rgba(255,255,255,0.55)" }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${w}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: i * 0.12, ease }}
                    />
                  </div>
                </div>
              );
            })}
            <p className="text-white/60 text-sm pt-2 border-t border-white/10">
              The combiner cut shuffled records from {count(c.combineInputRecords)} to {count(c.combineOutputRecords)} (
              <span className="text-white">
                {(Math.floor(10000 * (1 - c.combineOutputRecords / c.combineInputRecords)) / 100).toFixed(2)}% fewer
              </span>
              ) and network traffic from {count(c.mapOutputBytes)} to {count(c.reduceShuffleBytes)} bytes. Bars use a log
              scale.
            </p>
          </div>
        </section>

        {/* DEPENDENCY GRAPH */}
        <section className="py-10 md:py-14">
          <SectionHeading eyebrow="Where this job fits" title="Pipeline" italic="dependencies" />
          <div className="liquid-glass rounded-3xl border border-white/10 p-4 md:p-6">
            <DependencyGraph current={job} />
            <p className="text-white/40 text-xs mt-3">
              The four jobs are independent: each depends only on the cleaned HDFS input, so they could run at the same
              time. Verification, the graphs and the API depend on their output. Click another job to open it.
            </p>
          </div>
        </section>

        {/* CODE */}
        <section className="py-10 md:py-14">
          <SectionHeading eyebrow="The actual code that ran" title="Mapper &" italic="reducer" />
          <div className="grid lg:grid-cols-2 gap-6">
            <CodeBlock title={`mapreduce/${job.slug}/mapper.py`} code={mapperCode} accent={job.accent} />
            <CodeBlock title={`mapreduce/${job.slug}/reducer.py  (also the combiner)`} code={reducerCode} accent={job.accent} />
          </div>
          <div className="liquid-glass rounded-3xl border border-white/10 mt-6 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10">
              <Terminal className="w-4 h-4 text-white/60" />
              <span className="font-mono text-xs text-white/70">Submitted to YARN by run_hadoop.sh</span>
            </div>
            <pre className="p-5 text-[12px] leading-relaxed font-mono text-white/80 overflow-x-auto">{hadoopCommand(job)}</pre>
          </div>
        </section>

        {/* RESULTS */}
        <section className="py-10 md:py-14">
          <SectionHeading eyebrow="Output · part-00000" title="What the job" italic="found" />
          <div className="liquid-glass rounded-3xl border border-white/10 p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <p className="text-white/70 text-sm md:text-base max-w-2xl">{job.takeaway}</p>
              <span
                className={`text-[11px] font-mono px-2.5 py-1 rounded-full border ${
                  source === "live"
                    ? "text-emerald-300 border-emerald-500/30 bg-emerald-950/40"
                    : "text-white/50 border-white/15"
                }`}
              >
                {source === "live" ? "Live API" : source === "loading" ? "Loading…" : "Offline snapshot"}
              </span>
            </div>
            <ol className="space-y-2.5">
              {results.map((r, i) => (
                <li key={r.label} className="grid grid-cols-[2rem_minmax(0,1fr)] md:grid-cols-[2rem_16rem_minmax(0,1fr)] gap-x-3 items-center">
                  <span className="font-mono text-xs text-white/35">{job.slug === "monthly_sales" ? "" : i + 1}</span>
                  <span className="text-sm text-white/85 truncate" title={r.label}>
                    {r.label}
                  </span>
                  <div className="col-start-2 md:col-start-3 flex items-center gap-3 min-w-0">
                    <div className="h-2.5 flex-1 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: job.accent }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(100 * r.value) / maxResult}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, delay: i * 0.04, ease }}
                      />
                    </div>
                    <span className="font-mono text-xs text-white/60 shrink-0 w-40 text-right">{r.display}</span>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-white/35 text-xs mt-6">
              {job.slug === "monthly_sales"
                ? `All ${c.reduceOutputRecords} months.`
                : `Top 10 of ${count(c.reduceOutputRecords)} keys, sorted by value.`}{" "}
              Served by the FastAPI backend from results/output/{job.slug}/part-00000.
            </p>
          </div>
        </section>

        {/* PREV / NEXT */}
        <nav className="grid sm:grid-cols-2 gap-4 pt-6">
          <Link href={`/jobs/${prev.slug}`} className="liquid-glass rounded-3xl border border-white/10 p-6 hover:bg-white/5 transition group">
            <span className="text-white/40 text-xs flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Previous job
            </span>
            <span className="block text-xl mt-2 group-hover:text-white">
              <span className="font-mono text-white/40 mr-2">{prev.number}</span>
              {prev.title}
            </span>
          </Link>
          <Link
            href={`/jobs/${next.slug}`}
            className="liquid-glass rounded-3xl border border-white/10 p-6 hover:bg-white/5 transition group sm:text-right"
          >
            <span className="text-white/40 text-xs flex items-center gap-1.5 sm:justify-end">
              Next job <ArrowRight className="w-3.5 h-3.5" />
            </span>
            <span className="block text-xl mt-2">
              <span className="font-mono text-white/40 mr-2">{next.number}</span>
              {next.title}
            </span>
          </Link>
        </nav>
      </main>
    </div>
  );
}
