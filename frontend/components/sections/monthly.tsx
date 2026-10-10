"use client";

import { useMemo } from "react";
import { Reveal } from "@/components/ui/reveal";
import { AreaTrend, ChartCard, Sparkline } from "@/components/ui/revenue-charts-kpi";
import Timeline, { type JourneyItem, type Month as MonthName } from "@/components/ui/timeline";
import { money, monthParts, monthShort, type Dataset, type Month } from "@/lib/api";
import { Section } from "./section";

const axisMoney = (v: number) => (v >= 1e6 ? `£${(v / 1e6).toFixed(1)}M` : `£${(v / 1e3).toFixed(0)}K`);
const pct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;

/** Picks the notable months out of the series and writes one line about each. */
function buildStory(monthly: Month[]) {
  if (monthly.length < 3) return { top: [], bottom: [] };
  const first = monthly[0];
  const last = monthly[monthly.length - 1];
  const full = monthly.slice(1, -1); // months with a change_pct and a full set of days
  const by = (f: (m: Month) => number) => full.reduce((a, b) => (f(b) > f(a) ? b : a));

  const drop = by((m) => -(m.change_pct ?? 0));
  const rise = by((m) => m.change_pct ?? 0);
  const steady = by((m) => -Math.abs(m.change_pct ?? 0));
  const peak = by((m) => m.revenue);
  const million = full.find((m) => m.revenue >= 1e6);

  const candidates: [Month | undefined, string][] = [
    [first, `Data starts: ${money(first.revenue)} in the first month of orders`],
    [drop, `Biggest drop: ${pct(drop.change_pct ?? 0)} to ${money(drop.revenue)}`],
    [rise, `Biggest jump: ${pct(rise.change_pct ?? 0)} to ${money(rise.revenue)}`],
    [steady, `Steadiest month: ${pct(steady.change_pct ?? 0)}, holding at ${money(steady.revenue)}`],
    [million, million ? `First £1M month: ${money(million.revenue)} (${pct(million.change_pct ?? 0)})` : ""],
    [peak, `Peak: ${money(peak.revenue)}, the busiest month of the year`],
    [last, `Only 1–9 Dec is in the data: ${money(last.revenue)} before it ends`],
  ];

  const seen = new Set<string>();
  const picked = candidates
    .filter(([m]) => m && !seen.has(m.month) && seen.add(m.month))
    .slice(0, 7)
    .map(([m, content]) => {
      const { year, month } = monthParts(m!.month);
      return { id: m!.month, year, month: month as MonthName, content } satisfies JourneyItem;
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  // Alternate above / below the line, at most 4 above and 3 below
  const top: JourneyItem[] = [];
  const bottom: JourneyItem[] = [];
  picked.forEach((item, i) => ((i % 2 === 0 && top.length < 4) || bottom.length >= 3 ? top : bottom).push(item));
  return { top, bottom };
}

export function Monthly({ data }: { data: Dataset }) {
  const { monthly, summary } = data;
  const story = useMemo(() => buildStory(monthly), [monthly]);
  const rows = monthly.map((m) => ({ month: m.month, revenue: m.revenue }));

  return (
    <>
      <Section
        id="monthly"
        eyebrow="03 · Monthly sales"
        title={<>Revenue builds towards the holidays.</>}
        lede="Job 4 keys every order line by its invoice month. Revenue climbs from September and peaks in November, as wholesale buyers stock up for Christmas."
      >
        <Reveal>
          <ChartCard
            title="Monthly revenue"
            subtitle="Dec 2010 – Dec 2011 · December 2011 covers only 1–9 Dec"
            actions={
              <span className="rounded-full bg-secondary px-3 py-1 font-mono text-[11px] text-muted-foreground ring-1 ring-border">
                peak {monthShort(summary.best_month.month)} · {money(summary.best_month.revenue)}
              </span>
            }
          >
            <AreaTrend
              data={rows}
              xKey="month"
              series={[{ key: "revenue", label: "Revenue", slot: 1 }]}
              format={axisMoney}
              xFormat={monthShort}
              height={300}
              description="Monthly revenue from December 2010 to December 2011"
            />
          </ChartCard>
        </Reveal>
      </Section>

      <Timeline
        title="A year of orders"
        periodLabel="Dec 2010 – Dec 2011"
        activeColor="#5b9bff"
        topItems={story.top}
        bottomItems={story.bottom}
        media={
          <div className="flex h-full w-full flex-col justify-between bg-card p-[2vw] ring-1 ring-border max-[600px]:p-[6vw]">
            <div>
              <p className="font-mono text-[0.9vw] uppercase tracking-[0.2em] text-muted-foreground max-[600px]:text-[3vw]">
                Monthly revenue
              </p>
              <p className="mt-[0.6vw] font-display text-[3.2vw] leading-none max-[600px]:text-[10vw]">
                {money(summary.total_revenue)}
              </p>
            </div>
            <Sparkline data={monthly.map((m) => m.revenue)} height={140} className="w-full" />
            <div className="flex justify-between font-mono text-[0.8vw] text-muted-foreground max-[600px]:text-[2.6vw]">
              <span>{monthShort(monthly[0]?.month ?? "2010-12")}</span>
              <span>{monthShort(monthly[monthly.length - 1]?.month ?? "2011-12")}</span>
            </div>
          </div>
        }
      />
    </>
  );
}
