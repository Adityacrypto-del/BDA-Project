"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Code2, ArrowRight } from "lucide-react";

export function PhilosophySection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      id="jobs"
      className="bg-black py-28 md:py-40 px-6 overflow-hidden scroll-mt-20"
    >
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl md:text-7xl lg:text-8xl text-white tracking-tight mb-16 md:mb-24 font-normal"
        >
          Hadoop{" "}
          <span
            className="italic text-white/40 font-instrument"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            x
          </span>{" "}
          MapReduce
        </motion.h2>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left Column: Interactive MapReduce Key-Value Terminal */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="liquid-glass rounded-3xl p-6 md:p-8 relative border border-white/10 font-mono text-xs md:text-sm"
          >
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-white/60" />
                <span className="text-white/40 uppercase tracking-widest text-[11px]">
                  Streaming Dataflow
                </span>
              </div>
              <span className="text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded">
                YARN Job: Success
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-white/30 block text-[11px] mb-1">
                  1. INPUT LINE (TAB-SEPARATED)
                </span>
                <div className="bg-black/60 p-3 rounded-lg text-white/80 overflow-x-auto text-xs">
                  536370&nbsp;&nbsp;22728&nbsp;&nbsp;ALARM CLOCK BAKELIKE PINK&nbsp;&nbsp;24&nbsp;&nbsp;3.75&nbsp;&nbsp;France
                </div>
              </div>

              <div className="flex justify-center text-white/20">
                <ArrowRight className="w-4 h-4 rotate-90" />
              </div>

              <div>
                <span className="text-white/30 block text-[11px] mb-1">
                  2. MAPPER OUTPUT (KEY ➔ VALUE)
                </span>
                <div className="bg-black/60 p-3 rounded-lg text-sky-300 text-xs">
                  France <span className="text-white/40">➔</span> 90.00
                </div>
              </div>

              <div className="flex justify-center text-white/20">
                <ArrowRight className="w-4 h-4 rotate-90" />
              </div>

              <div>
                <span className="text-white/30 block text-[11px] mb-1">
                  3. SHUFFLE & SORT (KEY GROUPING)
                </span>
                <div className="bg-black/60 p-3 rounded-lg text-amber-300 text-xs">
                  France <span className="text-white/40">➔</span> [90.00, 29.50, 63.80, ...]
                </div>
              </div>

              <div className="flex justify-center text-white/20">
                <ArrowRight className="w-4 h-4 rotate-90" />
              </div>

              <div>
                <span className="text-white/30 block text-[11px] mb-1">
                  4. REDUCER / COMBINER RESULT
                </span>
                <div className="bg-black/60 p-3 rounded-lg text-emerald-300 font-semibold text-xs">
                  France <span className="text-white/40">➔</span> £182,697.39 (1.86% global share)
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Text Blocks */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col justify-center"
          >
            {/* Block 1 */}
            <div>
              <p className="text-white/40 text-xs tracking-widest uppercase mb-4 font-medium">
                Job 1 & 2: Revenue Distribution
              </p>
              <p className="text-white/70 text-base md:text-lg leading-relaxed">
                Job 1 aggregates sales revenue across all 3,998 unique items. The highest earning SKU is the{" "}
                <span className="text-white font-medium">Regency Cakestand 3 Tier</span> (£169,505.64), demonstrating thin catalog dispersion where no single item exceeds 2% of sales.
                Job 2 computes territorial sales across 38 countries, revealing that the{" "}
                <span className="text-white font-medium">United Kingdom</span> dominates with 84.71% (£8,314,970.56) of total revenue.
              </p>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-white/10 my-8 md:my-10" />

            {/* Block 2 */}
            <div>
              <p className="text-white/40 text-xs tracking-widest uppercase mb-4 font-medium">
                Job 3 & 4: Volume & Seasonality
              </p>
              <p className="text-white/70 text-base md:text-lg leading-relaxed">
                Job 3 quantifies raw physical volume to identify fast-moving staples:{" "}
                <span className="text-white font-medium">World War 2 Gliders</span> led with 54,711 units shipped.
                Job 4 tracks revenue month-by-month across 13 months, surfacing explosive holiday acceleration peaking in{" "}
                <span className="text-white font-medium">November 2011</span> at £1,436,127.66.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default PhilosophySection;
