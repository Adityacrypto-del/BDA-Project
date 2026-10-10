"use client";

import { AnimatePresence, motion } from "motion/react";
import { Database, FileSpreadsheet, Filter, GitMerge, Layers, Sigma } from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { CountUp } from "@/components/ui/count-up";
import { count, type Dataset } from "@/lib/api";
import { Section } from "./section";

type JobKey = "product" | "country" | "quantity" | "monthly";

/* Hadoop counters from the real run (results/hadoop_run_log.txt). */
const RAW_ROWS = 541_909;
const CLEAN_ROWS = 519_516;

const JOBS: Record<JobKey, { label: string; dir: string; emits: string; combined: number; keys: number; slot: number }> = {
  product: { label: "Sales by product", dir: "sales_by_product", emits: "Description → Quantity × UnitPrice", combined: 6_950, keys: 3_998, slot: 1 },
  country: { label: "Sales by country", dir: "sales_by_country", emits: "Country → Quantity × UnitPrice", combined: 70, keys: 38, slot: 2 },
  quantity: { label: "Top sellers", dir: "top_selling_products", emits: "Description → Quantity", combined: 6_950, keys: 3_998, slot: 3 },
  monthly: { label: "Monthly sales", dir: "monthly_sales", emits: "YYYY-MM → Quantity × UnitPrice", combined: 14, keys: 13, slot: 4 },
};

export function PipelineFlow({ data }: { data: Dataset }) {
  const [job, setJob] = useState<JobKey>("product");
  const j = JOBS[job];
  const color = `var(--chart-${j.slot})`;

  const sample: Record<JobKey, [string, string]> = {
    product: [data.productsRevenue[0]?.product_raw ?? "", (data.productsRevenue[0]?.revenue ?? 0).toFixed(2)],
    country: [data.countries[0]?.country ?? "", (data.countries[0]?.revenue ?? 0).toFixed(2)],
    quantity: [data.productsQuantity[0]?.product_raw ?? "", String(data.productsQuantity[0]?.units_sold ?? 0)],
    monthly: [data.summary.best_month.month, data.summary.best_month.revenue.toFixed(2)],
  };

  const stages: { icon: ReactNode; name: string; detail: string; records: number; unit: string }[] = [
    { icon: <FileSpreadsheet className="size-4" />, name: "Raw Excel", detail: "Online Retail.xlsx", records: RAW_ROWS, unit: "rows" },
    { icon: <Filter className="size-4" />, name: "Clean", detail: "pandas · cancellations removed", records: CLEAN_ROWS, unit: "rows" },
    { icon: <Database className="size-4" />, name: "HDFS", detail: "/user/…/retail/input · 44.6 MB", records: CLEAN_ROWS, unit: "lines" },
    { icon: <Layers className="size-4" />, name: "Map", detail: j.emits, records: CLEAN_ROWS, unit: "pairs" },
    { icon: <GitMerge className="size-4" />, name: "Combine + shuffle", detail: "map-side sums, sorted by key", records: j.combined, unit: "pairs" },
    { icon: <Sigma className="size-4" />, name: "Reduce", detail: `${j.dir}/part-00000`, records: j.keys, unit: "keys" },
  ];

  return (
    <Section
      id="pipeline"
      eyebrow="02 · Pipeline"
      title={<>From half a million rows to a few thousand keys.</>}
      lede="Each job streams the same cleaned file through a Python mapper and reducer on Hadoop Streaming. The reducer doubles as a combiner, so most of the summing happens before the shuffle. Pick a job to watch the record counts change."
    >
      <AnimatedTabs
        className="mb-8 flex-wrap"
        value={job}
        onChange={setJob}
        tabs={(Object.keys(JOBS) as JobKey[]).map((k) => ({ value: k, label: JOBS[k].label }))}
      />

      <div className="flex flex-col items-stretch lg:flex-row lg:items-center">
        {stages.map((s, i) => (
          <Fragment key={s.name}>
            {i > 0 && <Connector records={stages[i - 1].records} color={color} />}
            <motion.div
              layout
              className="relative min-w-0 flex-1 rounded-[16px] bg-card p-4 ring-1 ring-border"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.6 }}
            >
              <p className="mb-3 flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
                <span className="grid size-7 place-content-center rounded-lg" style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}>
                  {s.icon}
                </span>
                {s.name}
              </p>
              <p className="text-[22px] leading-none font-semibold tracking-tight">
                <CountUp value={s.records} duration={1.2} />
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{s.unit}</p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={s.detail}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mt-3 truncate font-mono text-[10.5px] text-muted-foreground"
                  title={s.detail}
                >
                  {s.detail}
                </motion.p>
              </AnimatePresence>
            </motion.div>
          </Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={job}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35 }}
          className="mt-8 grid gap-4 md:grid-cols-[1.3fr_1fr]"
        >
          <pre className="overflow-x-auto whitespace-pre rounded-[16px] bg-card p-5 font-mono text-[12px] leading-relaxed ring-1 ring-border">
            <span className="text-muted-foreground"># mapper emits for every input line</span>
            {"\n"}
            <span style={{ color }}>{j.emits.split(" → ")[0]}</span>
            {"\t"}
            {j.emits.split(" → ")[1]}
            {"\n\n"}
            <span className="text-muted-foreground"># reducer output, top key ({count(j.keys)} keys in total)</span>
            {"\n"}
            <span style={{ color }}>{sample[job][0]}</span>
            {"\t"}
            {sample[job][1]}
          </pre>
          <div className="grid content-center gap-2 rounded-[16px] bg-card p-5 ring-1 ring-border">
            <p className="text-[12px] text-muted-foreground">Combiner saving on the shuffle</p>
            <p className="text-[30px] leading-none font-semibold tracking-tight">
              <CountUp value={100 * (1 - j.combined / CLEAN_ROWS)} format={(v) => `${v.toFixed(2)}%`} duration={1} />
            </p>
            <p className="text-[12px] text-muted-foreground">
              {count(CLEAN_ROWS)} map outputs become {count(j.combined)} records before they cross the network.
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </Section>
  );
}

/** A connector with particles flowing along it; more records → more particles. */
function Connector({ records, color }: { records: number; color: string }) {
  const n = Math.max(1, Math.min(10, Math.round(Math.log10(records) * 1.8)));
  return (
    <div aria-hidden className="relative mx-auto h-10 w-px shrink-0 lg:mx-0 lg:h-px lg:w-10">
      <div className="absolute inset-0 bg-border" />
      {Array.from({ length: n }, (_, i) => (
        <span key={i}>
          <motion.span
            className="absolute left-1/2 hidden size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full lg:block"
            style={{ background: color, top: "50%", boxShadow: `0 0 8px ${color}` }}
            animate={{ left: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: (i / n) * 1.4, ease: "linear" }}
          />
          <motion.span
            className="absolute top-0 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full lg:hidden"
            style={{ background: color, boxShadow: `0 0 8px ${color}` }}
            animate={{ top: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: (i / n) * 1.4, ease: "linear" }}
          />
        </span>
      ))}
    </div>
  );
}
