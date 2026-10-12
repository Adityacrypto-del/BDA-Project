"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Terminal, ArrowDown, CheckCircle2, Cpu } from "lucide-react";

const pipelineSteps = [
  {
    step: "01",
    title: "Raw Ingestion",
    detail: "541,909 transactions loaded from UCI Online Retail Excel dataset",
    badge: "541k records",
  },
  {
    step: "02",
    title: "Data Cleaning",
    detail: "Filters cancellations (C-invoices), reverses order lines, removes invalid prices",
    badge: "519,516 clean",
  },
  {
    step: "03",
    title: "HDFS Staging",
    detail: "Tab-separated stream written to Hadoop Distributed File System via hdfs dfs -put",
    badge: "HDFS Block",
  },
  {
    step: "04",
    title: "MapReduce Execution",
    detail: "Python Streaming Mappers & associative Combiners run across 4 analytics jobs",
    badge: "YARN / Streaming",
  },
];

export function FeaturedVideoSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const scrollToJobs = () => {
    const el = document.getElementById("jobs");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      id="architecture"
      className="bg-black pt-6 md:pt-10 pb-20 md:pb-32 px-6 overflow-hidden scroll-mt-20"
    >
      <div ref={ref} className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="liquid-glass rounded-3xl overflow-hidden p-6 md:p-12 relative border border-white/10"
        >
          {/* Subtle grid and glow backdrop */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.03)_0%,_transparent_70%)] pointer-events-none" />

          {/* Header row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pb-6 border-b border-white/10 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Terminal className="w-4 h-4 text-white/50" />
                <span className="text-white/40 text-xs tracking-widest uppercase font-medium">
                  Pipeline Architecture
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl text-white font-normal tracking-tight">
                From Raw Excel Transactions to Distributed HDFS Insights
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-white/60 bg-white/[0.04] px-4 py-2 rounded-full border border-white/10 self-start md:self-auto">
              <Cpu className="w-3.5 h-3.5 text-white/80" />
              <span>Hadoop 3.5 · Python 3 · MapReduce</span>
            </div>
          </div>

          {/* Pipeline flow diagram */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-12 relative z-10">
            {pipelineSteps.map((item, index) => (
              <div
                key={item.step}
                className="liquid-glass rounded-2xl p-5 flex flex-col justify-between hover:bg-white/[0.04] transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs text-white/30 font-semibold">
                      {item.step}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/10 text-white/70">
                      {item.badge}
                    </span>
                  </div>
                  <h4 className="text-base font-medium text-white mb-2 group-hover:text-white/90">
                    {item.title}
                  </h4>
                  <p className="text-xs text-white/50 leading-relaxed">
                    {item.detail}
                  </p>
                </div>
                {index < pipelineSteps.length - 1 && (
                  <div className="hidden md:flex justify-end mt-4 pt-2 text-white/20">
                    <ArrowDown className="w-4 h-4 -rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom Card & Action */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pt-6 border-t border-white/10 relative z-10">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-white/70 text-xs tracking-wider uppercase font-medium">
                  Combiner Optimization
                </span>
              </div>
              <p className="text-white/70 text-sm leading-relaxed">
                Because summation over a key-sorted stream is associative and commutative,
                the reducer functions as an in-mapper combiner, eliminating over 80% of network shuffle data transfer.
              </p>
            </div>

            <motion.button
              type="button"
              onClick={scrollToJobs}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="liquid-glass rounded-full px-8 py-3 text-white text-sm font-medium self-start md:self-auto cursor-pointer hover:bg-white/10 transition-colors shrink-0"
            >
              Explore 4 MapReduce Jobs
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default FeaturedVideoSection;
