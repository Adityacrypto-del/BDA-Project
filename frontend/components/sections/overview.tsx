"use client";

import { Crown, Globe2, Package, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { CountUp } from "@/components/ui/count-up";
import { Reveal } from "@/components/ui/reveal";
import { KpiCard } from "@/components/ui/revenue-charts-kpi";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { compact, count, countryName, money, monthParts, type Dataset } from "@/lib/api";
import { Section } from "./section";

export function Ticker({ data }: { data: Dataset }) {
  const items = data.productsRevenue.map((p) => `${p.product} · ${money(p.revenue)}`);
  const loop = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-border bg-card/40 py-3 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div className="animate-marquee flex w-max gap-10 whitespace-nowrap font-mono text-[12px] text-muted-foreground">
        {loop.map((t, i) => (
          <span key={i} className="flex items-center gap-10">
            {t}
            <span className="text-primary">◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function Overview({ data }: { data: Dataset }) {
  const { summary, monthly } = data;
  const trend = monthly.map((m) => m.revenue);
  // The last month is partial (the dataset stops on 9 Dec 2011), so compare the last two full months
  const full = monthly.slice(0, -1);
  const last = full[full.length - 1];
  const best = monthParts(summary.best_month.month);

  return (
    <Section
      id="overview"
      eyebrow="01 · Overview"
      title={<>The year in four numbers.</>}
      lede="Every figure below is read from the reducer output files (results/output/*/part-00000) through the FastAPI backend."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          <KpiCard
            key="rev"
            label="Total revenue"
            value={<CountUp value={summary.total_revenue} format={(v) => money(v)} />}
            delta={last.change_pct !== null ? last.change_pct / 100 : undefined}
            period={`${monthParts(last.month).month.slice(0, 3)} vs previous month`}
            trend={trend}
          />,
          <KpiCard
            key="units"
            label="Units sold"
            value={<CountUp value={summary.total_units_sold} format={(v) => compact(v)} />}
            period={`${count(summary.total_units_sold)} items`}
          />,
          <KpiCard
            key="products"
            label="Distinct products"
            value={<CountUp value={summary.product_count} />}
          />,
          <KpiCard
            key="countries"
            label="Countries"
            value={<CountUp value={summary.country_count} />}
          />,
        ].map((card, i) => (
          <Reveal key={i} delay={i * 0.08} className="h-full [&>*]:h-full">
            {card}
          </Reveal>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Headline
          i={0}
          icon={<Crown className="size-4" />}
          label="Top product · revenue"
          title={summary.top_product_by_revenue.product}
          value={money(summary.top_product_by_revenue.revenue)}
        />
        <Headline
          i={1}
          icon={<Package className="size-4" />}
          label="Top product · units"
          title={summary.top_product_by_quantity.product}
          value={`${count(summary.top_product_by_quantity.units_sold)} units`}
        />
        <Headline
          i={2}
          icon={<Globe2 className="size-4" />}
          label="Top country"
          title={countryName(summary.top_country.country)}
          value={`${summary.top_country.share_pct}% of revenue`}
        />
        <Headline
          i={3}
          icon={<TrendingUp className="size-4" />}
          label="Best month"
          title={`${best.month} ${best.year}`}
          value={money(summary.best_month.revenue)}
        />
      </div>
    </Section>
  );
}

function Headline({ i, icon, label, title, value }: { i: number; icon: ReactNode; label: string; title: string; value: string }) {
  return (
    <Reveal delay={0.1 + i * 0.08} className="h-full">
      <SpotlightCard className="h-full p-5">
        <div className="flex h-full flex-col gap-4">
          <p className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
            <span className="grid size-7 place-content-center rounded-lg bg-primary/12 text-primary">{icon}</span>
            {label}
          </p>
          <p className="text-[17px] leading-snug font-semibold tracking-tight">{title}</p>
          <p className="mt-auto font-mono text-[13px] text-muted-foreground">{value}</p>
        </div>
      </SpotlightCard>
    </Reveal>
  );
}
