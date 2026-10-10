"use client";

import { useMemo } from "react";
import { CountUp } from "@/components/ui/count-up";
import { ImageStreamHero } from "@/components/ui/image-stream-hero";
import { ScrambleText } from "@/components/ui/scramble-text";
import { count, countryName, money, monthParts, type Dataset } from "@/lib/api";
import { useDataCards, type CardSpec } from "@/lib/data-cards";

/* The corridor from frontend-bitch/05-image-stream-hero, fed with reducer
 * output: every card that rushes past is one key and its total. */

const CLEAN_ROWS = 519_516;

function buildSpecs(data: Dataset): CardSpec[] {
  const { productsRevenue, productsQuantity, countries, monthly, summary } = data;
  const total = summary.total_revenue;
  const byRevenue = productsRevenue.slice(0, 4).map<CardSpec>((p) => ({
    kicker: `sales_by_product · #${String(p.rank).padStart(2, "0")}`,
    title: p.product,
    value: money(p.revenue),
    share: p.share_pct / productsRevenue[0].share_pct,
    shareLabel: `${p.share_pct}% of revenue`,
    raw: `${p.product_raw}\t${p.revenue.toFixed(2)}`,
    slot: 1,
  }));
  const byCountry = countries.slice(1, 3).map<CardSpec>((c) => ({
    kicker: `sales_by_country · #${String(c.rank).padStart(2, "0")}`,
    title: countryName(c.country),
    value: money(c.revenue),
    share: c.revenue / (countries[1]?.revenue ?? 1),
    shareLabel: `${c.share_pct}% of revenue`,
    raw: `${c.country}\t${c.revenue.toFixed(2)}`,
    slot: 2,
  }));
  const byUnits = productsQuantity.slice(0, 2).map<CardSpec>((p) => ({
    kicker: `top_selling_products · #${String(p.rank).padStart(2, "0")}`,
    title: p.product,
    value: `${count(p.units_sold)} units`,
    share: p.units_sold / productsQuantity[0].units_sold,
    shareLabel: `${p.share_pct}% of units`,
    raw: `${p.product_raw}\t${p.units_sold}`,
    slot: 3,
  }));
  const peak = Math.max(...monthly.map((m) => m.revenue));
  const byMonth = [...monthly]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 2)
    .map<CardSpec>((m) => {
      const { month, year } = monthParts(m.month);
      return {
        kicker: `monthly_sales · ${m.month}`,
        title: `${month} ${year}`,
        value: money(m.revenue),
        share: m.revenue / peak,
        shareLabel: `${((100 * m.revenue) / total).toFixed(1)}% of the year`,
        raw: `${m.month}\t${m.revenue.toFixed(2)}`,
        slot: 4,
      };
    });
  // Interleave the jobs so neighbouring cards differ
  const out: CardSpec[] = [];
  const queues = [byRevenue, byCountry, byUnits, byMonth];
  while (queues.some((q) => q.length)) for (const q of queues) if (q.length) out.push(q.shift()!);
  return out;
}

export function RecordStream({ data }: { data: Dataset }) {
  const specs = useMemo(() => buildSpecs(data), [data]);
  const urls = useDataCards(specs, 540, 750);
  const images = useMemo(() => urls.map((src, i) => ({ src, alt: specs[i]?.title })), [urls, specs]);
  const { product_count, country_count, month_count } = data.summary;
  // product_count appears twice: once by revenue, once by units
  const keys = 2 * product_count + country_count + month_count;

  return (
    <section id="stream" aria-label="Reducer output stream" className="relative">
      <ImageStreamHero
        images={images}
        cards={10}
        speed={22}
        axis={58}
        className="h-[78svh] min-h-[520px] sm:h-[100svh] sm:min-h-[620px] w-full bg-background [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]"
      >
        <div className="pointer-events-none relative z-10 flex h-full flex-col items-center justify-between px-4 py-[14vh] text-center">
          <div>
            <p className="mb-4 font-mono text-[11px] tracking-[0.25em] text-primary uppercase">
              <ScrambleText text="hdfs:///user/retail/output/*/part-00000" />
            </p>
            <h2 className="mx-auto max-w-3xl font-display text-[clamp(2.2rem,5.5vw,4.4rem)] leading-[0.98] tracking-tight [text-shadow:0_4px_40px_rgba(0,0,0,0.9)]">
              Every card is one line of reducer output.
            </h2>
          </div>
          <div className="flex flex-wrap items-end justify-center gap-x-10 gap-y-4 rounded-[16px] bg-background/60 px-6 py-4 ring-1 ring-border backdrop-blur-md">
            <Stat label="lines mapped" value={CLEAN_ROWS} />
            <span className="hidden font-mono text-muted-foreground sm:block">→</span>
            <Stat label="keys reduced, 4 jobs" value={keys} />
            <span className="hidden font-mono text-muted-foreground sm:block">→</span>
            <Stat label="in revenue" value={data.summary.total_revenue} format={(v) => money(v)} />
          </div>
        </div>
      </ImageStreamHero>
    </section>
  );
}

function Stat({ label, value, format }: { label: string; value: number; format?: (v: number) => string }) {
  return (
    <div className="text-left">
      <p className="text-[24px] leading-none font-semibold tracking-tight tabular-nums">
        <CountUp value={value} format={format} duration={1.6} />
      </p>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
