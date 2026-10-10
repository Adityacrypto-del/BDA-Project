"use client";

import { AnimatePresence, motion } from "motion/react";
import { Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInView } from "motion/react";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { Reveal } from "@/components/ui/reveal";
import { count, money, searchProducts, type Dataset, type ProductQuantity, type ProductRevenue } from "@/lib/api";
import { useDataCards, type CardSpec } from "@/lib/data-cards";
import type { Source } from "@/lib/use-dataset";
import { Section } from "./section";

// frontend-bitch/03-liquid-glass-carousel: three.js + gsap, so it loads on the client only
const LiquidGlassCarousel = dynamic(() => import("@/components/ui/liquid-glass-carousel"), { ssr: false });

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

  // One rendered card per top-8 product, for the glass carousel
  const top = useMemo(() => toRows(metric === "revenue" ? data.productsRevenue : data.productsQuantity).slice(0, 8), [data, metric]);
  const specs = useMemo<CardSpec[]>(
    () =>
      top.map((r) => ({
        kicker: `${metric === "revenue" ? "sales_by_product" : "top_selling_products"} · #${String(r.rank).padStart(2, "0")}`,
        title: r.product,
        value: metric === "revenue" ? money(r.value) : `${count(r.value)} units`,
        share: r.value / top[0].value,
        shareLabel: `${r.share_pct}% of ${metric === "revenue" ? "revenue" : "units"}`,
        raw: `${r.product.toUpperCase()}\t${metric === "revenue" ? r.value.toFixed(2) : r.value}`,
        slot: metric === "revenue" ? 1 : 3,
      })),
    [top, metric],
  );
  const urls = useDataCards(specs, 900, 1200);
  const items = useMemo(
    () =>
      urls.map((src, i) => ({
        src,
        title: top[i]?.product ?? "",
        aspect: 3 / 4,
      })),
    [urls, top],
  );
  const [active, setActive] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const near = useInView(stage, { once: true, margin: "200px 0px" });
  const cur = top[active] ?? top[0];

  return (
    <Section
      id="products"
      eyebrow="04 · Products"
      title={<>Cake stands earn the most. Gliders sell the most.</>}
      lede="Jobs 1 and 3 group the same order lines by product: one adds up revenue, the other adds up units. Cheap items sold in bulk lead on units, while pricier decor leads on revenue."
    >
      <Reveal>
        <div ref={stage} className="relative mb-4 h-[72vh] min-h-[480px] overflow-hidden rounded-[22px] bg-card ring-1 ring-border">
          {near && items.length > 0 && (
            <LiquidGlassCarousel key={metric} items={items} background="#0e1017" panelHeight={520} className="rounded-[22px]" onActiveChange={setActive} />
          )}
          {cur && (
            <div className="pointer-events-none absolute right-6 bottom-5 left-6 hidden items-end justify-between gap-2 md:flex">
              <p className="font-mono text-[11px] text-muted-foreground">Drag or scroll sideways · click a card to focus it</p>
              <p className="rounded-full bg-background/70 px-3 py-1 font-mono text-[11px] ring-1 ring-border backdrop-blur">
                #{cur.rank} · {fmt(cur.value)} · {cur.share_pct}%
              </p>
            </div>
          )}
        </div>
      </Reveal>

      <Reveal>
        <div className="rounded-[18px] bg-card p-5 ring-1 ring-border">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <AnimatedTabs
              value={metric}
              onChange={(m) => {
                setMetric(m);
                setResults(null);
                setActive(0);
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
                        transition={{
                          duration: 1,
                          delay: 0.1 + i * 0.05,
                          ease: [0.16, 1, 0.3, 1],
                        }}
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
