"use client";

import { ArrowDown, BookOpen } from "lucide-react";
import dynamic from "next/dynamic";
import { API_URL, count, money, type Dataset } from "@/lib/api";

// three.js needs the browser; load the canvas on the client only
const PrismHero = dynamic(() => import("@/components/ui/prism-hero").then((m) => m.PrismHero), {
  ssr: false,
  loading: () => <div className="h-[260vh]" />,
});

const RAW_ROWS = 541_909;
const CLEAN_ROWS = 519_516;

export function Hero({ data }: { data: Dataset }) {
  const { summary } = data;
  return (
    <div id="top">
      <PrismHero
        intro={
          <>
            <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              UCI Online Retail · {count(RAW_ROWS)} transactions · Dec 2010 – Dec 2011
            </p>
            <h1 className="mx-auto max-w-4xl font-display text-[clamp(2.6rem,7vw,5.5rem)] leading-[0.95] tracking-tight">
              What sold, where,
              <br />
              and <em className="text-primary">when</em>.
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-[15px] text-muted-foreground">
              Four Hadoop MapReduce jobs over a year of e-commerce orders. Scroll to reduce.
            </p>
          </>
        }
        outro={
          <>
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              Reduced from {count(CLEAN_ROWS)} cleaned records
            </p>
            <p className="font-display text-[clamp(3.5rem,11vw,9rem)] leading-none tracking-tight">
              {money(summary.total_revenue)}
            </p>
            <p className="mx-auto mt-5 max-w-xl text-[15px] text-muted-foreground">
              in revenue across {count(summary.product_count)} products, {summary.country_count} countries and{" "}
              {summary.month_count} months.
            </p>
          </>
        }
        actions={
          <>
            <a
              href="#overview"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-3 font-mono text-[13px] font-medium text-background transition-opacity hover:opacity-90"
            >
              Explore results <ArrowDown className="size-4" />
            </a>
            <a
              href={`${API_URL}/docs`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-foreground/25 px-7 py-3 font-mono text-[13px] font-medium transition-colors hover:bg-foreground/10"
            >
              <BookOpen className="size-4" /> API docs
            </a>
          </>
        }
      />
    </div>
  );
}
