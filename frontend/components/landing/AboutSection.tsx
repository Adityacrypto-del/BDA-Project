"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Database, Layers, ShoppingBag, Globe2 } from "lucide-react";

const kpiStats = [
  {
    icon: Database,
    label: "Total Revenue",
    value: "£9,815,291.49",
    detail: "Validated sales across Dec 2010 – Dec 2011",
  },
  {
    icon: Layers,
    label: "Units Sold",
    value: "5,333,762",
    detail: "Aggregated via associative combiners",
  },
  {
    icon: ShoppingBag,
    label: "Distinct Products",
    value: "3,998",
    detail: "Top SKU: Regency Cakestand (£169.5k)",
  },
  {
    icon: Globe2,
    label: "Global Reach",
    value: "38 Countries",
    detail: "UK dominant with 84.71% total share",
  },
];

export function AboutSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      id="overview"
      className="bg-black pt-32 md:pt-44 pb-16 md:pb-24 px-6 overflow-hidden relative scroll-mt-20"
    >
      {/* Subtle radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.03)_0%,_transparent_70%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Label */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-white/40 text-xs md:text-sm tracking-widest uppercase mb-6 md:mb-8 font-medium"
        >
          Project Overview & Ecosystem
        </motion.p>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl md:text-6xl lg:text-7xl text-white leading-[1.1] tracking-tight font-normal max-w-5xl"
        >
          Processing{" "}
          <span
            className="italic text-white/60 font-instrument"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            541,909 transactions
          </span>{" "}
          across{" "}
          <br className="hidden md:block" />
          <span
            className="italic text-white/60 font-instrument"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            HDFS clusters with Python streaming.
          </span>
        </motion.h2>

        {/* Project KPI Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-16 md:mt-20"
        >
          {kpiStats.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="liquid-glass rounded-2xl p-5 md:p-6 flex flex-col justify-between hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white/40 text-xs tracking-wider uppercase font-medium">
                    {kpi.label}
                  </span>
                  <div className="liquid-glass rounded-full p-2 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-white/70" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-medium tracking-tight text-white mb-1">
                    {kpi.value}
                  </div>
                  <p className="text-white/40 text-xs leading-relaxed">
                    {kpi.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

export default AboutSection;
