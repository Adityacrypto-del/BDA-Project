"use client";

import { Fragment, useCallback, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Terminal, Play, Loader2, ChevronDown, Database, Clock, Rows3 } from "lucide-react";
import hiveSnapshot from "@/lib/hive-snapshot.json";

type HiveQuery = { id: string; title: string; description: string; sql: string };
type HiveResult = {
  id: string;
  columns: string[];
  rows: (string | number | null)[][];
  row_count: number;
  elapsed_ms: number;
  engine: string;
};
type RunState =
  | { status: "idle" }
  | { status: "running"; id: string }
  | { status: "done"; id: string; result: HiveResult; source: "live" | "cached" };

const SNAPSHOT = hiveSnapshot as {
  ddl: string;
  queries: HiveQuery[];
  results: Record<string, HiveResult>;
};

const MONEY_COLUMNS = new Set(["revenue", "total_revenue", "total_spent", "avg_order_value"]);
const PERCENT_COLUMNS = new Set(["share_pct", "change_pct"]);

const KEYWORDS =
  /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|AS|DESC|ASC|AND|OR|ON|OVER|CASE|WHEN|THEN|END|DISTINCT|CREATE|EXTERNAL|TABLE|IF|NOT|EXISTS|ROW FORMAT DELIMITED|FIELDS TERMINATED BY|STORED AS|TEXTFILE|LOCATION)\b/g;
const FUNCTIONS = /\b(COUNT|SUM|ROUND|LAG|SUBSTR|CAST|INT|STRING|DOUBLE)\b/g;

function apiUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  // Same host as the page, so Safari's https upgrade of "localhost" does not apply
  // when the site is opened via 127.0.0.1.
  return `http://${window.location.hostname}:8000`;
}

/** Minimal HiveQL highlighter: keywords, functions, strings and numbers. */
function HighlightedSql({ sql }: { sql: string }) {
  const tokens = sql.split(/('[^']*'|\b\d+(?:\.\d+)?\b)/g);
  return (
    <>
      {tokens.map((tok, i) => {
        if (tok.startsWith("'")) {
          return (
            <span key={i} className="text-emerald-300/90">
              {tok}
            </span>
          );
        }
        if (/^\d/.test(tok)) {
          return (
            <span key={i} className="text-amber-300/90">
              {tok}
            </span>
          );
        }
        const html = tok
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(KEYWORDS, '<span class="text-sky-300">$1</span>')
          .replace(FUNCTIONS, '<span class="text-violet-300">$1</span>');
        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </>
  );
}

function formatCell(column: string, value: string | number | null) {
  if (value === null) return <span className="text-white/30">NULL</span>;
  if (typeof value !== "number") return value;
  if (MONEY_COLUMNS.has(column)) {
    return `£${value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (PERCENT_COLUMNS.has(column)) {
    const sign = column === "change_pct" && value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  }
  if (column === "hour") return `${String(value).padStart(2, "0")}:00`;
  return value.toLocaleString("en-GB");
}

export function HiveQuerySection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [selectedId, setSelectedId] = useState(SNAPSHOT.queries[0].id);
  const [run, setRun] = useState<RunState>({ status: "idle" });
  const [showDdl, setShowDdl] = useState(false);
  const runCounter = useRef(0);

  const selected = SNAPSHOT.queries.find((q) => q.id === selectedId) ?? SNAPSHOT.queries[0];

  const execute = useCallback(async (id: string) => {
    const runId = ++runCounter.current;
    setSelectedId(id);
    setRun({ status: "running", id });

    let result: HiveResult | null = null;
    let source: "live" | "cached" = "live";
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`${apiUrl()}/api/hive/run/${id}`, {
        method: "POST",
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`${res.status}`);
      result = (await res.json()) as HiveResult;
    } catch {
      result = SNAPSHOT.results[id];
      source = "cached";
    }
    if (runId === runCounter.current && result) {
      setRun({ status: "done", id, result, source });
    }
  }, []);

  const isRunning = run.status === "running";
  const shown = run.status === "done" && run.id === selectedId ? run : null;

  return (
    <section
      ref={ref}
      id="hive"
      className="bg-black py-28 md:py-36 px-6 overflow-hidden relative scroll-mt-20 border-t border-white/10"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.03)_0%,_transparent_60%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-12 md:mb-16 gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-4 h-4 text-white/50" />
              <span className="text-white/40 text-xs tracking-widest uppercase font-medium">
                SQL on Hadoop
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl text-white tracking-tight font-normal">
              HiveQL{" "}
              <em
                className="italic"
                style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
              >
                Query Console
              </em>
            </h2>
            <p className="text-white/50 text-sm mt-4 max-w-xl leading-relaxed">
              The same questions as the MapReduce jobs, written as HiveQL against a{" "}
              <code className="font-mono text-white/70">sales</code> table over the cleaned
              dataset. Pick a query and it runs against all 519,516 rows.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDdl((v) => !v)}
            className="liquid-glass rounded-full px-5 py-2 text-white/80 hover:text-white text-xs font-medium hover:bg-white/10 transition-colors cursor-pointer border border-white/10 inline-flex items-center gap-2 self-start md:self-auto"
          >
            <Database className="w-3.5 h-3.5" />
            {showDdl ? "Hide" : "Show"} table definition
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${showDdl ? "rotate-180" : ""}`}
            />
          </button>
        </motion.div>

        {/* DDL */}
        <AnimatePresence initial={false}>
          {showDdl && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="liquid-glass rounded-2xl border border-white/10 p-5 mb-8">
                <div className="text-[11px] font-mono text-white/40 mb-3">
                  -- Hive external table over the HDFS input folder used by run_hadoop.sh
                </div>
                <pre className="font-mono text-xs md:text-[13px] leading-relaxed text-white/80 overflow-x-auto">
                  <HighlightedSql sql={SNAPSHOT.ddl} />
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-6 md:gap-8">
          {/* Query list */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 -mx-6 px-6 lg:mx-0 lg:px-0"
          >
            {SNAPSHOT.queries.map((q, i) => {
              const active = q.id === selectedId;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => execute(q.id)}
                  className={`liquid-glass rounded-2xl p-4 text-left border transition-colors cursor-pointer shrink-0 w-64 lg:w-auto group ${
                    active
                      ? "border-white/30 bg-white/[0.06]"
                      : "border-white/10 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] text-white/30 mb-1">
                        Q{String(i + 1).padStart(2, "0")}
                      </div>
                      <div className="text-sm text-white font-medium leading-snug">
                        {q.title}
                      </div>
                      <div className="text-[11px] text-white/45 mt-1 leading-relaxed">
                        {q.description}
                      </div>
                    </div>
                    <span
                      className={`rounded-full p-2 shrink-0 transition-colors ${
                        active ? "bg-white text-black" : "bg-white/5 text-white/60 group-hover:text-white"
                      }`}
                    >
                      {isRunning && run.id === q.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
          </motion.div>

          {/* Console */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="liquid-glass rounded-3xl border border-white/10 flex flex-col min-w-0"
          >
            {/* Editor bar */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-white/10">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex gap-1.5 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                  <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                  <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                </span>
                <span className="font-mono text-[11px] text-white/40 ml-2 truncate">
                  hive&gt; {selected.id}.hql
                </span>
              </div>
              <button
                type="button"
                onClick={() => execute(selected.id)}
                disabled={isRunning}
                className="bg-white rounded-full pl-3 pr-4 py-1.5 text-black text-xs font-medium hover:bg-white/90 transition-transform active:scale-95 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-wait shrink-0"
              >
                {isRunning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {isRunning ? "Running" : "Run"}
              </button>
            </div>

            {/* Query text */}
            <pre className="font-mono text-xs md:text-[13px] leading-relaxed text-white/80 px-5 py-4 overflow-x-auto border-b border-white/10">
              <HighlightedSql sql={selected.sql} />
            </pre>

            {/* Result */}
            <div className="px-5 py-4 flex-1 min-h-[220px] flex flex-col">
              {!shown ? (
                <div className="flex-1 flex items-center justify-center gap-2 text-white/40 text-xs font-mono">
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Executing query…
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Press Run or pick a query to execute it
                    </>
                  )}
                </div>
              ) : (
                <motion.div
                  key={`${shown.id}-${shown.result.elapsed_ms}-${shown.source}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col gap-3 min-w-0"
                >
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-mono text-white/45">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 border ${
                        shown.source === "live"
                          ? "border-emerald-400/30 text-emerald-300"
                          : "border-amber-400/30 text-amber-300"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          shown.source === "live" ? "bg-emerald-400" : "bg-amber-400"
                        }`}
                      />
                      {shown.source === "live" ? "Live" : "Cached (API offline)"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Rows3 className="w-3 h-3" />
                      {shown.result.row_count} row{shown.result.row_count === 1 ? "" : "s"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {shown.result.elapsed_ms} ms
                    </span>
                    <span className="text-white/30">{shown.result.engine}</span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-white/[0.04]">
                          {shown.result.columns.map((c) => (
                            <th
                              key={c}
                              className="text-left font-mono font-medium text-white/50 px-3 py-2 whitespace-nowrap"
                            >
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {shown.result.rows.map((row, r) => (
                          <tr key={r} className="border-t border-white/5 hover:bg-white/[0.03]">
                            {row.map((cell, c) => (
                              <Fragment key={c}>
                                <td
                                  className={`px-3 py-2 whitespace-nowrap ${
                                    typeof cell === "number"
                                      ? "font-mono text-white text-right"
                                      : "text-white/80"
                                  } ${
                                    shown.result.columns[c] === "change_pct" &&
                                    typeof cell === "number"
                                      ? cell >= 0
                                        ? "!text-emerald-300"
                                        : "!text-rose-300"
                                      : ""
                                  }`}
                                >
                                  {formatCell(shown.result.columns[c], cell)}
                                </td>
                              </Fragment>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        <div className="mt-8 text-[11px] font-mono text-white/30 leading-relaxed">
          Queries run through the FastAPI backend (POST /api/hive/run/&#123;id&#125;) on an
          SQLite copy of the cleaned data. They only use syntax that Hive and SQLite share,
          so the text above runs unchanged in Hive. If the backend is offline, the last saved
          results are shown.
        </div>
      </div>
    </section>
  );
}

export default HiveQuerySection;
