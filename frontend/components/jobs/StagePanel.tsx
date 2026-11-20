"use client";

import { AnimatePresence, motion } from "framer-motion";
import { count } from "@/lib/api";
import { SPLITS, fmtValue, type JobDef, type KV, type Row, type StageId, type Trace } from "@/lib/mr-jobs";

type Stat = { label: string; value: string };

function stageCopy(job: JobDef, stage: StageId): { title: string; body: string; stats: Stat[] } {
  const c = job.counters;
  // Floor, so 99.997% shows as 99.99% rather than rounding up to 100%.
  const pct = (a: number, b: number) => `${(Math.floor(10000 * (1 - a / b)) / 100).toFixed(2)}%`;
  switch (stage) {
    case "input":
      return {
        title: "1 · Read the cleaned data from HDFS",
        body:
          "The cleaned file is uploaded once with hdfs dfs -put. HDFS stores it in blocks across the DataNodes. Each line is one transaction with 8 tab-separated fields. All four jobs read this same input.",
        stats: [
          { label: "Input records", value: count(c.mapInputRecords) },
          { label: "Bytes read", value: count(c.hdfsBytesRead) },
          { label: "Fields per line", value: "8" },
        ],
      };
    case "split":
      return {
        title: "2 · Split the input",
        body:
          "Hadoop divides the file into input splits. YARN starts one map task per split, in its own container, so the splits are processed in parallel. On a bigger cluster, more splits means more mappers working at once.",
        stats: [
          { label: "Input splits", value: String(c.mapTasks) },
          { label: "Map tasks launched", value: String(c.mapTasks) },
          { label: "Reduce tasks launched", value: String(c.reduceTasks) },
        ],
      };
    case "map":
      return {
        title: "3 · Map: emit one key → value pair per row",
        body: `mapper.py reads lines from stdin, skips malformed ones, and prints "key TAB value". For this job the key is ${job.keyLabel} and the value is ${job.valueLabel}. Mappers never talk to each other; each one only sees its own split.`,
        stats: [
          { label: "Map input records", value: count(c.mapInputRecords) },
          { label: "Map output records", value: count(c.mapOutputRecords) },
          { label: "Map output bytes", value: count(c.mapOutputBytes) },
          { label: "Total map task time", value: `${(c.mapTimeMs / 1000).toFixed(1)} s` },
        ],
      };
    case "combine":
      return {
        title: "4 · Combine: pre-aggregate on the map side",
        body:
          "Before anything leaves the mapper's machine, Hadoop sorts the map output and runs reducer.py on it as a combiner, adding up the values for each key. Summing is associative and commutative, so this gives the same final answer while sending far less data over the network.",
        stats: [
          { label: "Combine input records", value: count(c.combineInputRecords) },
          { label: "Combine output records", value: count(c.combineOutputRecords) },
          { label: "Records saved", value: pct(c.combineOutputRecords, c.combineInputRecords) },
        ],
      };
    case "shuffle":
      return {
        title: "5 · Shuffle & sort: bring each key together",
        body:
          "The framework partitions combiner output by key, copies it across the network to the reducer, and merge-sorts it. After this step every value for the same key arrives next to each other. That guarantee is what lets the reducer be a simple loop.",
        stats: [
          { label: "Shuffled records", value: count(c.reduceInputRecords) },
          { label: "Shuffle bytes", value: count(c.reduceShuffleBytes) },
          { label: "vs. map output bytes", value: count(c.mapOutputBytes) },
          { label: "Distinct keys (groups)", value: count(c.reduceInputGroups) },
        ],
      };
    case "reduce":
      return {
        title: "6 · Reduce: one total per key",
        body:
          "reducer.py streams the sorted pairs and keeps a running total. When the key changes, it prints the finished total for the previous key and starts again. It only ever holds one key in memory, so it scales to any input size.",
        stats: [
          { label: "Reduce input groups", value: count(c.reduceInputGroups) },
          { label: "Reduce output records", value: count(c.reduceOutputRecords) },
          { label: "Total reduce task time", value: `${(c.reduceTimeMs / 1000).toFixed(1)} s` },
        ],
      };
    case "output":
      return {
        title: "7 · Write the result back to HDFS",
        body:
          "The reducer writes part-00000 to HDFS. run_hadoop.sh copies it to results/output/, verify_results.py checks every key against pandas, visualize.py draws the graphs, and the FastAPI backend serves it to this website.",
        stats: [
          { label: "Output records", value: count(c.reduceOutputRecords) },
          { label: "HDFS bytes written", value: count(c.hdfsBytesWritten) },
          { label: "Job wall time", value: `${c.wallSeconds} s` },
          { label: "YARN application", value: c.appId.replace("application_", "app_…") },
        ],
      };
  }
}

/* ------------------------------------------------------------- pieces -- */

function SplitLabel({ i, extra }: { i: number; extra?: string }) {
  return (
    <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/35 mb-2">
      <span>Split {i}</span>
      {extra && <span className="normal-case tracking-normal font-mono">{extra}</span>}
    </div>
  );
}

function KVLines({ kvs, job, dimKey }: { kvs: KV[]; job: JobDef; dimKey?: boolean }) {
  return (
    <ul className="space-y-1.5">
      {kvs.map((kv, i) => (
        <motion.li
          key={`${kv.key}-${i}`}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-2 bg-black/60 rounded-lg px-3 py-1.5 font-mono text-[11.5px]"
        >
          <span className={`truncate ${dimKey ? "text-white/70" : "text-sky-300"}`} title={kv.key}>
            {kv.key}
          </span>
          <span className="text-white/25 shrink-0">⇥</span>
          <span className="ml-auto shrink-0" style={{ color: job.accent }}>
            {fmtValue(job, kv.value)}
          </span>
        </motion.li>
      ))}
    </ul>
  );
}

const keyField = (job: JobDef): keyof Row =>
  job.slug === "sales_by_country" ? "country" : job.slug === "monthly_sales" ? "date" : "description";

function RowLine({ r, job }: { r: Row; job: JobDef }) {
  const kf = keyField(job);
  const hl = (f: keyof Row, text: string, kind: "key" | "value" | "none") => (
    <span
      className={
        kind === "key" ? "text-sky-300" : kind === "value" ? "font-semibold" : "text-white/40"
      }
      style={kind === "value" ? { color: job.accent } : undefined}
      title={String(f)}
    >
      {text}
    </span>
  );
  const valKind = (f: "quantity" | "price") =>
    f === "quantity" || !job.integer ? ("value" as const) : ("none" as const);
  return (
    <div className="bg-black/60 rounded-lg px-3 py-1.5 font-mono text-[11px] whitespace-nowrap overflow-hidden text-ellipsis">
      {hl("invoice", r.invoice, "none")} {hl("description", r.description, kf === "description" ? "key" : "none")}{" "}
      {hl("quantity", String(r.quantity), valKind("quantity"))} {hl("date", r.date, kf === "date" ? "key" : "none")}{" "}
      {hl("price", r.price.toFixed(2), valKind("price"))} {hl("country", r.country, kf === "country" ? "key" : "none")}
    </div>
  );
}

function Legend({ job }: { job: JobDef }) {
  return (
    <div className="flex flex-wrap gap-4 text-[11px] text-white/45 mb-3">
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-sky-300" /> key ({job.keyLabel})
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full" style={{ background: job.accent }} /> value ({job.valueLabel})
      </span>
    </div>
  );
}

function TraceView({ job, stage, trace }: { job: JobDef; stage: StageId; trace: Trace }) {
  switch (stage) {
    case "input":
      return (
        <div>
          <Legend job={job} />
          <div className="space-y-1.5">
            {SPLITS.flat().map((r) => (
              <RowLine key={r.invoice} r={r} job={job} />
            ))}
          </div>
        </div>
      );
    case "split":
      return (
        <div className="grid sm:grid-cols-2 gap-4">
          {SPLITS.map((rows, i) => (
            <div key={i} className="rounded-2xl border border-white/10 p-3">
              <SplitLabel i={i} extra={`${rows.length} rows → mapper ${i}`} />
              <div className="space-y-1.5">
                {rows.map((r) => (
                  <RowLine key={r.invoice} r={r} job={job} />
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    case "map":
      return (
        <div className="grid sm:grid-cols-2 gap-4">
          {trace.mapped.map((kvs, i) => (
            <div key={i} className="rounded-2xl border border-white/10 p-3">
              <SplitLabel i={i} extra={`${kvs.length} pairs emitted`} />
              <KVLines kvs={kvs} job={job} />
            </div>
          ))}
        </div>
      );
    case "combine":
      return (
        <div className="grid sm:grid-cols-2 gap-4">
          {trace.combined.map((kvs, i) => (
            <div key={i} className="rounded-2xl border border-white/10 p-3">
              <SplitLabel i={i} extra={`${trace.mapped[i].length} → ${kvs.length} pairs`} />
              <KVLines kvs={kvs} job={job} />
            </div>
          ))}
        </div>
      );
    case "shuffle":
      return (
        <div className="space-y-2">
          <p className="text-[11px] text-white/40 mb-1">Sorted by key, with values from both combiners grouped together:</p>
          {trace.grouped.map((g, i) => (
            <motion.div
              key={g.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="flex items-center gap-2 bg-black/60 rounded-lg px-3 py-2 font-mono text-[11.5px]"
            >
              <span className="text-sky-300 truncate">{g.key}</span>
              <span className="text-white/25 shrink-0">⇥</span>
              <span className="ml-auto shrink-0 text-white/80">
                [
                {g.values.map((v, j) => (
                  <span key={j}>
                    <span style={{ color: job.accent }}>{fmtValue(job, v)}</span>
                    {j < g.values.length - 1 && <span className="text-white/30">, </span>}
                  </span>
                ))}
                ]
              </span>
            </motion.div>
          ))}
        </div>
      );
    case "reduce":
    case "output":
      return (
        <div>
          {stage === "output" && (
            <p className="text-[11px] text-white/40 mb-2 font-mono">part-00000 (for these 8 sample rows)</p>
          )}
          <KVLines kvs={trace.reduced} job={job} />
        </div>
      );
  }
}

export default function StagePanel({ job, stage, trace }: { job: JobDef; stage: StageId; trace: Trace }) {
  const copy = stageCopy(job, stage);
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stage}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="grid lg:grid-cols-5 gap-6"
      >
        <div className="lg:col-span-2 liquid-glass rounded-3xl border border-white/10 p-6 md:p-7">
          <h3 className="text-xl md:text-2xl text-white font-medium tracking-tight mb-3">{copy.title}</h3>
          <p className="text-white/65 text-sm md:text-[15px] leading-relaxed">{copy.body}</p>
          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="text-white/35 text-[10px] tracking-widest uppercase mb-3">Real Hadoop counters</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              {copy.stats.map((s) => (
                <div key={s.label}>
                  <dt className="text-white/40 text-[11px]">{s.label}</dt>
                  <dd className="text-white font-mono text-sm mt-0.5 break-all">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="lg:col-span-3 liquid-glass rounded-3xl border border-white/10 p-6 md:p-7 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/35 text-[10px] tracking-widest uppercase">Trace · 8 real rows at this stage</p>
            <span className="text-[10px] font-mono text-white/30">computed in your browser</span>
          </div>
          <TraceView job={job} stage={stage} trace={trace} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
