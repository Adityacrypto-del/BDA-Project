"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Table, Trophy, MapPin, PackageCheck, Calendar } from "lucide-react";

const topProductsRevenue = [
  { rank: 1, name: "Regency Cakestand 3 Tier", revenue: "£169,505.64", share: "1.73%" },
  { rank: 2, name: "White Hanging Heart T-Light Holder", revenue: "£100,052.42", share: "1.02%" },
  { rank: 3, name: "Party Bunting", revenue: "£98,610.18", share: "1.00%" },
  { rank: 4, name: "Jumbo Bag Red Retrospot", revenue: "£92,595.77", share: "0.94%" },
  { rank: 5, name: "Rabbit Night Light", revenue: "£66,807.63", share: "0.68%" },
];

const topCountries = [
  { rank: 1, country: "United Kingdom", revenue: "£8,314,970.56", share: "84.71%" },
  { rank: 2, country: "Netherlands", revenue: "£283,443.54", share: "2.89%" },
  { rank: 3, country: "EIRE", revenue: "£262,162.03", share: "2.67%" },
  { rank: 4, country: "Germany", revenue: "£203,605.08", share: "2.07%" },
  { rank: 5, country: "France", revenue: "£182,697.39", share: "1.86%" },
];

const topQuantities = [
  { rank: 1, name: "World War 2 Gliders Asstd Designs", units: "54,711 units" },
  { rank: 2, name: "Jumbo Bag Red Retrospot", units: "47,363 units" },
  { rank: 3, name: "Assorted Colour Bird Ornament", units: "36,381 units" },
  { rank: 4, name: "White Hanging Heart T-Light Holder", units: "35,317 units" },
  { rank: 5, name: "Popcorn Holder", units: "31,048 units" },
];

export function ResultsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      id="results"
      className="bg-black py-28 md:py-36 px-6 overflow-hidden relative scroll-mt-20 border-t border-white/10"
    >
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-12 md:mb-16 gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Table className="w-4 h-4 text-white/50" />
              <span className="text-white/40 text-xs tracking-widest uppercase font-medium">
                Verified MapReduce Outputs
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl text-white tracking-tight font-normal">
              Aggregated Job Statistics
            </h2>
          </div>
          <div className="text-white/40 text-xs font-mono">
            Hadoop part-00000 outputs verified with Pandas
          </div>
        </motion.div>

        {/* 3 Summary Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Table 1: Sales by Product */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="liquid-glass rounded-3xl p-6 border border-white/10 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Top SKUs by Revenue
                </h3>
              </div>
              <div className="space-y-3">
                {topProductsRevenue.map((p) => (
                  <div
                    key={p.rank}
                    className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-none"
                  >
                    <div className="flex items-center gap-2 max-w-[65%]">
                      <span className="font-mono text-white/30 text-[11px] w-4">
                        #{p.rank}
                      </span>
                      <span className="text-white/80 truncate">{p.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-white font-medium">{p.revenue}</div>
                      <div className="text-[10px] text-white/40">{p.share}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Table 2: Sales by Country */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="liquid-glass rounded-3xl p-6 border border-white/10 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                <MapPin className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Top Markets by Revenue
                </h3>
              </div>
              <div className="space-y-3">
                {topCountries.map((c) => (
                  <div
                    key={c.rank}
                    className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-none"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white/30 text-[11px] w-4">
                        #{c.rank}
                      </span>
                      <span className="text-white/80">{c.country}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-white font-medium">{c.revenue}</div>
                      <div className="text-[10px] text-white/40">{c.share}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Table 3: Top Selling by Volume */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="liquid-glass rounded-3xl p-6 border border-white/10 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                <PackageCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Top Volume Movers
                </h3>
              </div>
              <div className="space-y-3">
                {topQuantities.map((q) => (
                  <div
                    key={q.rank}
                    className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-none"
                  >
                    <div className="flex items-center gap-2 max-w-[65%]">
                      <span className="font-mono text-white/30 text-[11px] w-4">
                        #{q.rank}
                      </span>
                      <span className="text-white/80 truncate">{q.name}</span>
                    </div>
                    <span className="font-mono text-white font-medium text-xs">
                      {q.units}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Best Month & Dataset Footer Note */}
        <div className="mt-8 liquid-glass rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs border border-white/10">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-white/60" />
            <span className="text-white/70">
              Peak Month Velocity:{" "}
              <strong className="text-white font-semibold">November 2011 (£1,436,127.66)</strong>{" "}
              accounting for 14.6% of annual volume.
            </span>
          </div>
          <a
            href="https://archive.ics.uci.edu/dataset/352/online+retail"
            target="_blank"
            rel="noreferrer"
            className="text-white/40 hover:text-white transition-colors underline font-mono text-[11px]"
          >
            UCI Machine Learning Repository Reference ↗
          </a>
        </div>
      </div>
    </section>
  );
}

export default ResultsSection;
