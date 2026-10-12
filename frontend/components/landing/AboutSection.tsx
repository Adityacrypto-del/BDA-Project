"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

export function AboutSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      id="about"
      className="bg-black pt-32 md:pt-44 pb-10 md:pb-14 px-6 overflow-hidden relative"
    >
      {/* Subtle radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.03)_0%,_transparent_70%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Label */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-white/40 text-sm tracking-widest uppercase mb-6 md:mb-8 font-medium"
        >
          About Us
        </motion.p>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl md:text-6xl lg:text-7xl text-white leading-[1.1] tracking-tight font-normal"
        >
          Pioneering{" "}
          <span
            className="italic text-white/60 font-instrument"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            ideas
          </span>{" "}
          for{" "}
          <br className="hidden md:block" />
          <span
            className="italic text-white/60 font-instrument"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            minds that create, build, and inspire.
          </span>
        </motion.h2>
      </div>
    </section>
  );
}

export default AboutSection;
