"use client";

import { motion } from "motion/react";
import { Reveal } from "@/components/ui/reveal";
import { ChartCard, DonutBreakdown, type DonutSlice } from "@/components/ui/revenue-charts-kpi";
import { countryName, money, type Dataset } from "@/lib/api";
import { Section } from "./section";

export function Countries({ data }: { data: Dataset }) {
  const { countries, summary } = data;
  const total = summary.total_revenue;

  // Four named slices plus "Other", so the five colour slots never repeat
  const head = countries.slice(0, 4);
  const other = countries.slice(4).reduce((n, c) => n + c.revenue, 0);
  const slices: DonutSlice[] = [
    ...head.map((c, i) => ({ label: countryName(c.country), value: c.revenue, slot: (i + 1) as 1 | 2 | 3 | 4 })),
    { label: `Other ${countries.length - 4}`, value: other, slot: 5 },
  ];

  // The UK dwarfs everything, so rank the rest on their own scale
  const abroad = countries.slice(1, 13);
  const abroadTotal = countries.slice(1).reduce((n, c) => n + c.revenue, 0);
  const max = abroad[0]?.revenue ?? 1;

  return (
    <Section
      id="countries"
      eyebrow="05 · Countries"
      title={<>A UK shop that ships to {countries.length} countries.</>}
      lede={`Job 2 keys each order line by the customer's country. The United Kingdom brings in ${summary.top_country.share_pct}% of revenue; the other ${countries.length - 1} countries add ${money(abroadTotal)} between them.`}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Reveal className="h-full">
          <ChartCard className="h-full" title="Share of revenue" subtitle={`${money(total)} in total`}>
            <DonutBreakdown
              data={slices}
              format={(v) => money(v, 1)}
              centerLabel="Revenue"
              size={200}
              description="Revenue share by country"
            />
          </ChartCard>
        </Reveal>

        <Reveal delay={0.1} className="h-full">
          <ChartCard className="h-full" title="Outside the UK" subtitle="Top 12 by revenue, on their own scale">
            <ol className="grid gap-2">
              {abroad.map((c, i) => (
                <li
                  key={c.country}
                  className="grid grid-cols-[8.5rem_1fr_4.5rem] items-center gap-3 text-[12.5px]"
                  title={`${countryName(c.country)}: ${money(c.revenue, 2)} (${c.share_pct}% of all revenue)`}
                >
                  <span className="truncate text-muted-foreground">{countryName(c.country)}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      className="h-full rounded-full bg-chart-2"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(100 * c.revenue) / max}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.1, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <span className="text-right font-medium tabular-nums">{money(c.revenue, 0)}</span>
                </li>
              ))}
            </ol>
          </ChartCard>
        </Reveal>
      </div>
    </Section>
  );
}
