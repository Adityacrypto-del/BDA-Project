"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Database, Github, ExternalLink, Cpu } from "lucide-react";
import AboutSection from "./AboutSection";
import FeaturedVideoSection from "./FeaturedVideoSection";
import PhilosophySection from "./PhilosophySection";
import ServicesSection from "./ServicesSection";
import ResultsSection from "./ResultsSection";

export function Index() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fadeAnimRef = useRef<number | null>(null);
  const isFadingOutRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Vanilla JS video opacity animation via requestAnimationFrame
  const fadeOpacity = (target: number, duration = 500, onDone?: () => void) => {
    const video = videoRef.current;
    if (!video) return;

    if (fadeAnimRef.current !== null) {
      cancelAnimationFrame(fadeAnimRef.current);
      fadeAnimRef.current = null;
    }

    const currentOpacity = parseFloat(video.style.opacity || "0");
    const startTime = performance.now();

    const step = (time: number) => {
      if (!videoRef.current) return;
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const val = currentOpacity + (target - currentOpacity) * progress;
      videoRef.current.style.opacity = val.toFixed(4);

      if (progress < 1) {
        fadeAnimRef.current = requestAnimationFrame(step);
      } else {
        fadeAnimRef.current = null;
        onDone?.();
      }
    };

    fadeAnimRef.current = requestAnimationFrame(step);
  };

  const handleCanPlay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {});
    fadeOpacity(1, 500);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration || isFadingOutRef.current) return;
    const remaining = video.duration - video.currentTime;
    if (remaining <= 0.55 && remaining > 0) {
      isFadingOutRef.current = true;
      fadeOpacity(0, 500);
    }
  };

  const handleEnded = () => {
    const video = videoRef.current;
    if (!video) return;
    video.style.opacity = "0";
    setTimeout(() => {
      if (!videoRef.current) return;
      videoRef.current.currentTime = 0;
      isFadingOutRef.current = false;
      videoRef.current.play().catch(() => {});
      fadeOpacity(1, 500);
    }, 100);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.style.opacity = "0";
      if (video.readyState >= 3) {
        handleCanPlay();
      }
    }
    return () => {
      if (fadeAnimRef.current !== null) {
        cancelAnimationFrame(fadeAnimRef.current);
      }
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const el = document.getElementById("results");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="bg-black text-white min-h-screen selection:bg-white/20 selection:text-white">
      {/* SECTION 1 -- HERO (full-viewport) with Cycling Background Video */}
      <section className="min-h-screen overflow-hidden relative flex flex-col justify-between">
        {/* Background video: Cycling animation */}
        <video
          ref={videoRef}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260402_054547_9875cfc5-155a-4229-8ec8-b7ba7125cbf8.mp4"
          className="absolute inset-0 w-full h-full object-cover object-bottom pointer-events-none"
          muted
          autoPlay
          playsInline
          preload="auto"
          style={{ opacity: 0 }}
          onCanPlay={handleCanPlay}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />

        {/* Navbar */}
        <header className="relative z-20 px-6 py-6 w-full">
          <nav className="liquid-glass rounded-full max-w-5xl mx-auto px-6 py-3 flex items-center justify-between border border-white/10">
            {/* Left: Project Branding & Nav Links */}
            <div className="flex items-center">
              <a
                href="#top"
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="flex items-center gap-2.5 group cursor-pointer"
              >
                <div className="liquid-glass rounded-full p-1.5 flex items-center justify-center">
                  <Database className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-semibold text-lg tracking-tight">
                  RetailMR
                </span>
              </a>

              <div className="hidden md:flex items-center gap-7 ml-8">
                <button
                  type="button"
                  onClick={() => scrollToSection("overview")}
                  className="text-white/80 hover:text-white text-sm font-medium transition-colors cursor-pointer"
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("architecture")}
                  className="text-white/80 hover:text-white text-sm font-medium transition-colors cursor-pointer"
                >
                  Pipeline
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("jobs")}
                  className="text-white/80 hover:text-white text-sm font-medium transition-colors cursor-pointer"
                >
                  Hadoop Jobs
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("graphs")}
                  className="text-white/80 hover:text-white text-sm font-medium transition-colors cursor-pointer"
                >
                  Visualizations
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("results")}
                  className="text-white/80 hover:text-white text-sm font-medium transition-colors cursor-pointer"
                >
                  Results
                </button>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4">
              <a
                href="https://archive.ics.uci.edu/dataset/352/online+retail"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors"
              >
                <span>Dataset</span>
                <ExternalLink className="w-3.5 h-3.5 text-white/40" />
              </a>
              <button
                type="button"
                onClick={() => scrollToSection("jobs")}
                className="liquid-glass rounded-full px-5 py-2 text-white text-sm font-medium hover:bg-white/10 transition-colors cursor-pointer"
              >
                Explore Jobs
              </button>
            </div>
          </nav>
        </header>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center -translate-y-[10%] md:-translate-y-[15%]">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full liquid-glass border border-white/10 text-xs font-mono text-white/70 mb-6">
            <Cpu className="w-3.5 h-3.5 text-white/80" />
            <span>Hadoop 3.5 · Python Streaming · 541,909 Transactions</span>
          </div>

          {/* Heading */}
          <h1
            className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl text-white tracking-tight whitespace-nowrap font-instrument"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Retail <em className="italic">MapReduce</em>.
          </h1>

          {/* Search / Filter input */}
          <form
            onSubmit={handleSearchSubmit}
            className="max-w-xl w-full mx-auto mt-8 md:mt-10 liquid-glass rounded-full pl-6 pr-2 py-2 flex items-center gap-3 border border-white/10 shadow-2xl"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 541,909 records (e.g. Regency Cakestand, UK)..."
              className="bg-transparent flex-1 text-white placeholder:text-white/40 outline-none text-sm md:text-base border-none focus:ring-0"
            />
            <button
              type="submit"
              aria-label="Search dataset results"
              className="bg-white rounded-full p-3 text-black hover:bg-white/90 transition-transform active:scale-95 flex items-center justify-center cursor-pointer shrink-0"
            >
              <ArrowRight className="w-5 h-5 text-black" />
            </button>
          </form>

          {/* Subtitle */}
          <p className="text-white/80 text-sm leading-relaxed px-4 max-w-lg mt-6 font-normal">
            Distributed Big Data analytics on the UCI Online Retail dataset. Cleaned, partitioned, and processed across HDFS worker nodes to unlock revenue, volume, and geographic insights.
          </p>

          {/* Action button */}
          <button
            type="button"
            onClick={() => scrollToSection("jobs")}
            className="liquid-glass rounded-full px-8 py-3 text-white text-sm font-medium hover:bg-white/10 transition-colors mt-6 cursor-pointer border border-white/10"
          >
            Explore 4 MapReduce Jobs
          </button>
        </div>

        {/* Social / project icons footer */}
        <footer className="relative z-10 flex justify-center gap-4 pb-12">
          <a
            href="https://github.com/Adityacrypto-del/BDA-Project"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub Repository"
            className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center cursor-pointer border border-white/10"
            title="GitHub Repository"
          >
            <Github className="w-5 h-5" />
          </a>
          <a
            href="https://archive.ics.uci.edu/dataset/352/online+retail"
            target="_blank"
            rel="noreferrer"
            aria-label="UCI Online Retail Dataset"
            className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center cursor-pointer border border-white/10"
            title="UCI Online Retail Dataset"
          >
            <Database className="w-5 h-5" />
          </a>
          <button
            type="button"
            onClick={() => scrollToSection("architecture")}
            aria-label="Pipeline Architecture"
            className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center cursor-pointer border border-white/10"
            title="Pipeline Architecture"
          >
            <Cpu className="w-5 h-5" />
          </button>
        </footer>
      </section>

      {/* SECTION 2 -- OVERVIEW & DATASET STATS */}
      <AboutSection />

      {/* SECTION 3 -- PIPELINE ARCHITECTURE (Cleaned Ingestion & Combiner) */}
      <FeaturedVideoSection />

      {/* SECTION 4 -- 4 HADOOP STREAMING JOBS */}
      <PhilosophySection />

      {/* SECTION 5 -- ANALYTICAL VISUALIZATIONS & MATPLOTLIB GRAPHS */}
      <ServicesSection />

      {/* SECTION 6 -- AGGREGATED JOB RESULTS & SUMMARY TABLES */}
      <ResultsSection />

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-black py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <div>
            Data: Chen, D. (2015). <em>Online Retail</em>. UCI Machine Learning Repository.
          </div>
          <div className="font-mono text-[11px] text-white/60">
            Hadoop 3.5 · Python Streaming · FastAPI · Next.js
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Index;
