"use client";

import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { ArrowUpRight, BarChart3, X } from "lucide-react";
import Image from "next/image";

const graphCards = [
  {
    image: "/graphs/1_sales_by_product.png",
    tag: "Job 1 — Revenue",
    title: "Sales by Product",
    stat: "£169.5k Top SKU",
    description:
      "Calculated via mapper emitting Description ➔ (Quantity × Price). Top item Regency Cakestand captures 1.73% of revenue, demonstrating high catalog diversity.",
  },
  {
    image: "/graphs/2_sales_by_country.png",
    tag: "Job 2 — Geography",
    title: "Sales by Country",
    stat: "84.71% United Kingdom",
    description:
      "Country ➔ (Quantity × Price) reveals heavy domestic concentration with UK generating £8.31M, followed by Netherlands (£283k) and EIRE (£262k).",
  },
  {
    image: "/graphs/3_top_selling_products.png",
    tag: "Job 3 — Volume",
    title: "Top-Selling Products",
    stat: "5.33M Total Units",
    description:
      "Description ➔ Quantity isolates volume movers. World War 2 Gliders led with 54,711 units, followed by Heart T-Light Holders and Popcorn Holders.",
  },
  {
    image: "/graphs/4_monthly_sales.png",
    tag: "Job 4 — Seasonality",
    title: "Monthly Sales Trend",
    stat: "£1.44M Peak Month",
    description:
      "YYYY-MM ➔ (Quantity × Price) tracks sales velocity across 13 months, highlighting strong Q4 holiday surge peaking in November 2011.",
  },
];

export function ServicesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [selectedGraph, setSelectedGraph] = useState<string | null>(null);

  return (
    <section
      ref={ref}
      id="graphs"
      className="bg-black py-28 md:py-40 px-6 overflow-hidden relative scroll-mt-20"
    >
      {/* Subtle radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.02)_0%,_transparent_60%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-baseline justify-between mb-12 md:mb-16"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-white/50" />
              <span className="text-white/40 text-xs tracking-widest uppercase font-medium">
                Analytical Visualizations
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl text-white tracking-tight font-normal">
              MapReduce Output Graphs
            </h2>
          </div>
          <span className="text-white/40 text-xs tracking-widest uppercase hidden md:inline-block font-mono">
            Matplotlib & Pandas Verified
          </span>
        </motion.div>

        {/* Four-card grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {graphCards.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
              transition={{
                duration: 0.8,
                delay: index * 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              onClick={() => setSelectedGraph(item.image)}
              className="liquid-glass rounded-3xl overflow-hidden group flex flex-col cursor-pointer border border-white/10 hover:border-white/20 transition-all"
            >
              {/* Card visual area */}
              <div className="aspect-[16/10] overflow-hidden relative bg-black/60 p-3">
                <div className="relative w-full h-full rounded-2xl overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-contain object-center transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-mono text-white/80 border border-white/10">
                  {item.stat}
                </div>
              </div>

              {/* Card body */}
              <div className="p-6 md:p-8 flex flex-col justify-between flex-1">
                <div className="flex items-center justify-between mb-3">
                  <span className="uppercase tracking-widest text-white/40 text-xs font-mono">
                    {item.tag}
                  </span>
                  <div className="liquid-glass rounded-full p-2 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    <ArrowUpRight className="w-4 h-4 text-white" />
                  </div>
                </div>

                <div>
                  <h3 className="text-white text-xl md:text-2xl mb-2 tracking-tight font-medium">
                    {item.title}
                  </h3>
                  <p className="text-white/50 text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedGraph && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedGraph(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md p-6 flex items-center justify-center cursor-zoom-out"
          >
            <div className="relative max-w-5xl w-full max-h-[90vh] aspect-[16/10] bg-neutral-950 rounded-2xl p-4 border border-white/20">
              <button
                type="button"
                onClick={() => setSelectedGraph(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="relative w-full h-full">
                <Image
                  src={selectedGraph}
                  alt="Expanded Graph"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default ServicesSection;
