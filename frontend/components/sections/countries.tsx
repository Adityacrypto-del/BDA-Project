"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { DotGlobe, type GlobeMarker } from "@/components/ui/dot-globe";
import { Reveal } from "@/components/ui/reveal";
import { ChartCard, DonutBreakdown, type DonutSlice } from "@/components/ui/revenue-charts-kpi";
import { countryName, money, type Dataset } from "@/lib/api";
import { COUNTRY_COORDS } from "@/lib/geo";
import { Section } from "./section";

export function Countries({ data }: { data: Dataset }) {
  const { countries, summary } = data;
  const total = summary.total_revenue;
  const [active, setActive] = useState<string | null>(null);

  // Four named slices plus "Other", so the five colour slots never repeat
  const head = countries.slice(0, 4);
  const other = countries.slice(4).reduce((n, c) => n + c.revenue, 0);
  const slices: DonutSlice[] = [
    ...head.map((c, i) => ({
      label: countryName(c.country),
      value: c.revenue,
      slot: (i + 1) as 1 | 2 | 3 | 4,
    })),
    { label: `Other ${countries.length - 4}`, value: other, slot: 5 },
  ];

  // The UK dwarfs everything, so rank the rest on their own scale
  const abroad = countries.slice(1, 13);
  const abroadTotal = countries.slice(1).reduce((n, c) => n + c.revenue, 0);
  const max = abroad[0]?.revenue ?? 1;

  // Marker size uses each country's share of non-UK revenue, so the UK
  // doesn't shrink every other marker to a dot
  const markers = useMemo<GlobeMarker[]>(
    () =>
      countries
        .filter((c) => COUNTRY_COORDS[c.country])
        .map((c, i) => ({
          id: c.country,
          label: countryName(c.country).replace(" (EIRE)", ""),
          lat: COUNTRY_COORDS[c.country][0],
          lon: COUNTRY_COORDS[c.country][1],
          weight: i === 0 ? (countries[1]?.revenue ?? 1) * 1.6 : c.revenue,
        })),
    [countries],
  );
  const focus = countries.find((c) => c.country === active);

  return (
    <Section
      id="countries"
      eyebrow="05 · Countries"
      title={<>A UK shop that ships to {countries.length} countries.</>}
      lede={`Job 2 keys each order line by the customer's country. The United Kingdom brings in ${summary.top_country.share_pct}% of revenue; the other ${countries.length - 1} countries add ${money(abroadTotal)} between them. Drag the globe, or hover a country.`}
    >
      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <Reveal className="h-full">
          <div className="relative h-[460px] overflow-hidden rounded-[18px] bg-card ring-1 ring-border sm:h-[560px]">
            <DotGlobe markers={markers} origin="United Kingdom" active={active} onHover={setActive} />
            <div className="pointer-events-none absolute top-4 left-4">
              <p className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">Orders shipped from the UK</p>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={focus?.country ?? "none"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-none absolute right-4 bottom-4 left-4 flex items-end justify-between gap-4 rounded-[12px] bg-background/70 p-4 ring-1 ring-border backdrop-blur"
              >
                {focus ? (
                  <>
                    <div>
                      <p className="text-[12px] text-muted-foreground">#{focus.rank} by revenue</p>
                      <p className="font-display text-[26px] leading-tight">{countryName(focus.country)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[20px] font-semibold tabular-nums">{money(focus.revenue, 2)}</p>
                      <p className="text-[12px] text-muted-foreground">{focus.share_pct}% of all revenue</p>
                    </div>
                  </>
                ) : (
                  <p className="text-[13px] text-muted-foreground">Marker size shows revenue outside the UK. Hover a marker or a row to see its total.</p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>

        <div className="grid gap-4">
          <Reveal delay={0.05}>
            <ChartCard title="Share of revenue" subtitle={`${money(total)} in total`}>
              <DonutBreakdown data={slices} format={(v) => money(v, 1)} centerLabel="Revenue" size={170} description="Revenue share by country" />
            </ChartCard>
          </Reveal>

          <Reveal delay={0.1}>
            <ChartCard title="Outside the UK" subtitle="Top 12 by revenue, on their own scale">
              <ol className="grid gap-0.5" onPointerLeave={() => setActive(null)}>
                {abroad.map((c, i) => (
                  <li
                    key={c.country}
                    onPointerEnter={() => setActive(c.country)}
                    className={`grid grid-cols-[8rem_1fr_4.2rem] items-center gap-3 rounded-[8px] px-1.5 py-1 text-[12.5px] transition-colors ${
                      active === c.country ? "bg-accent" : ""
                    }`}
                    title={`${countryName(c.country)}: ${money(c.revenue, 2)} (${c.share_pct}% of all revenue)`}
                  >
                    <span className="truncate text-muted-foreground">{countryName(c.country)}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <motion.div
                        className={`h-full rounded-full ${active === c.country ? "bg-chart-1" : "bg-chart-2"}`}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(100 * c.revenue) / max}%` }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 1.1,
                          delay: i * 0.05,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                      />
                    </div>
                    <span className="text-right font-medium tabular-nums">{money(c.revenue, 0)}</span>
                  </li>
                ))}
              </ol>
            </ChartCard>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
