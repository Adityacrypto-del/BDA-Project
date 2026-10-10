"use client";

import { AnimatePresence, motion } from "motion/react";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { Reveal } from "@/components/ui/reveal";
import { count, money, searchProducts, type Dataset, type ProductQuantity, type ProductRevenue } from "@/lib/api";
import type { Source } from "@/lib/use-dataset";
import { Section } from "./section";

type Metric = "revenue" | "quantity";
type Row = { rank: number; product: string; value: number; share_pct: number };

const toRows = (items: (ProductRevenue | ProductQuantity)[]): Row[] =>
  items.map((p) => ({
    rank: p.rank,
    product: p.product,
    value: "revenue" in p ? p.revenue : p.units_sold,
    share_pct: p.share_pct,
  }));

export function Products({ data, source }: { data: Dataset; source: Source }) {
  const [metric, setMetric] = useState<Metric>("revenue");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const base = toRows(metric === "revenue" ? data.productsRevenue : data.productsQuantity);
  const q = query.trim();

  // Search goes to the API (all 3,998 products); debounced while typing
  useEffect(() => {
    if (!q || source !== "live") return;
    const t = setTimeout(() => {
      searchProducts(metric, q)
        .then((r) => {
          setResults(toRows(r));
          setError(null);
        })
        .catch((e) => setError(String(e.message ?? e)));
    }, 250);
    return () => clearTimeout(t);
  }, [q, metric, source]);

  const offlineMatches = base.filter((r) => r.product.toLowerCase().includes(q.toLowerCase()));
  const rows = !q ? base : source === "live" ? (results ?? []) : offlineMatches;
  const max = Math.max(...rows.map((r) => r.value), 1);
  const fmt = metric === "revenue" ? (v: number) => money(v, 1) : (v: number) => count(v);

  return (
    <Section
      id="products"
      eyebrow="04 · Products"
      title={<>Cake stands earn the most. Gliders sell the most.</>}
      lede="Jobs 1 and 3 group the same order lines by product: one adds up revenue, the other adds up units. Cheap items sold in bulk lead on units, while pricier decor leads on revenue."
    >
      <Reveal>
        <div className="rounded-[18px] bg-card p-5 ring-1 ring-border">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <AnimatedTabs
              value={metric}
              onChange={(m) => {
                setMetric(m);
                setResults(null);
              }}
              tabs={[
                { value: "revenue", label: "By revenue" },
                { value: "quantity", label: "By units sold" },
              ]}
            />
            <label className="relative flex w-full items-center sm:w-72">
              <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={source === "live" ? "Search all 3,998 products…" : "Search the top 10…"}
                className="h-9 w-full rounded-full bg-secondary pr-9 pl-9 text-[13px] ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-primary"
              />
              {query && (
                <button aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-3 text-muted-foreground hover:text-foreground">
                  <X className="size-4" />
                </button>
              )}
            </label>
          </div>

          {error && <p className="mb-3 text-[12px] text-destructive">{error}</p>}

          <ol className="grid gap-1.5">
            <AnimatePresence mode="popLayout" initial={false}>
              {rows.map((r, i) => (
                <motion.li
                  layout
                  key={`${metric}-${r.product}`}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.35, delay: i * 0.03 }}
                  className="group relative grid grid-cols-[2.2rem_1fr_7.5rem] items-center gap-3 rounded-[10px] px-2 py-2 hover:bg-accent/60"
                  title={`${r.product}: ${fmt(r.value)} (${r.share_pct}% of total)`}
                >
                  <span className="font-mono text-[12px] text-muted-foreground tabular-nums">#{r.rank}</span>
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px]">{r.product}</p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <motion.div
                        className="h-full rounded-full bg-chart-1"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(100 * r.value) / max}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.1 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  </div>
                  <span className="text-right text-[13px] font-medium tabular-nums">
                    {fmt(r.value)}
                    <span className="ml-2 text-[11px] text-muted-foreground">{r.share_pct}%</span>
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
          {q && rows.length === 0 && <p className="py-6 text-center text-[13px] text-muted-foreground">No products match “{q}”.</p>}
        </div>
      </Reveal>
    </Section>
  );
}
