"use client";

import { useEffect, useRef } from "react";
import { Globe, ArrowRight } from "lucide-react";
import AboutSection from "./AboutSection";
import FeaturedVideoSection from "./FeaturedVideoSection";
import PhilosophySection from "./PhilosophySection";
import ServicesSection from "./ServicesSection";

function InstagramIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function TwitterIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  );
}

export function Index() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fadeAnimRef = useRef<number | null>(null);
  const isFadingOutRef = useRef(false);

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

  return (
    <div className="bg-black text-white min-h-screen selection:bg-white/20 selection:text-white">
      {/* SECTION 1 -- HERO (full-viewport) */}
      <section className="min-h-screen overflow-hidden relative flex flex-col justify-between">
        {/* Background video */}
        <video
          ref={videoRef}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_074625_a81f018a-956b-43fb-9aee-4d1508e30e6a.mp4"
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
          <nav className="liquid-glass rounded-full max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
            {/* Left */}
            <div className="flex items-center">
              <div className="flex items-center gap-2.5">
                <Globe className="w-6 h-6 text-white" />
                <span className="text-white font-semibold text-lg tracking-tight">
                  Asme
                </span>
              </div>
              <div className="hidden md:flex items-center gap-8 ml-8">
                <a
                  href="#features"
                  className="text-white/80 hover:text-white text-sm font-medium transition-colors"
                >
                  Features
                </a>
                <a
                  href="#pricing"
                  className="text-white/80 hover:text-white text-sm font-medium transition-colors"
                >
                  Pricing
                </a>
                <a
                  href="#about"
                  className="text-white/80 hover:text-white text-sm font-medium transition-colors"
                >
                  About
                </a>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="text-white text-sm font-medium hover:text-white/80 transition-colors cursor-pointer"
              >
                Sign Up
              </button>
              <button
                type="button"
                className="liquid-glass rounded-full px-6 py-2 text-white text-sm font-medium hover:bg-white/5 transition-colors cursor-pointer"
              >
                Login
              </button>
            </div>
          </nav>
        </header>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center -translate-y-[20%]">
          {/* Heading */}
          <h1
            className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl text-white tracking-tight whitespace-nowrap font-instrument"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Know it <em className="italic">all</em>.
          </h1>

          {/* Email input */}
          <form
            onSubmit={(e) => e.preventDefault()}
            className="max-w-xl w-full mx-auto mt-8 md:mt-10 liquid-glass rounded-full pl-6 pr-2 py-2 flex items-center gap-3"
          >
            <input
              type="email"
              placeholder="Enter your email"
              className="bg-transparent flex-1 text-white placeholder:text-white/40 outline-none text-sm md:text-base border-none focus:ring-0"
            />
            <button
              type="submit"
              aria-label="Submit email"
              className="bg-white rounded-full p-3 text-black hover:bg-white/90 transition-transform active:scale-95 flex items-center justify-center cursor-pointer shrink-0"
            >
              <ArrowRight className="w-5 h-5 text-black" />
            </button>
          </form>

          {/* Subtitle */}
          <p className="text-white text-sm leading-relaxed px-4 max-w-lg mt-6">
            Stay updated with the latest news and insights. Subscribe to our newsletter today and never miss out on exciting updates.
          </p>

          {/* Manifesto button */}
          <button
            type="button"
            className="liquid-glass rounded-full px-8 py-3 text-white text-sm font-medium hover:bg-white/5 transition-colors mt-6 cursor-pointer"
          >
            Manifesto
          </button>
        </div>

        {/* Social icons footer */}
        <footer className="relative z-10 flex justify-center gap-4 pb-12">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
            className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer"
          >
            <InstagramIcon className="w-5 h-5" />
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Twitter"
            className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer"
          >
            <TwitterIcon className="w-5 h-5" />
          </a>
          <a
            href="#global"
            aria-label="Global"
            className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer"
          >
            <Globe className="w-5 h-5" />
          </a>
        </footer>
      </section>

      {/* SECTION 2 -- ABOUT SECTION */}
      <AboutSection />

      {/* SECTION 3 -- FEATURED VIDEO */}
      <FeaturedVideoSection />

      {/* SECTION 4 -- PHILOSOPHY / INNOVATION x VISION */}
      <PhilosophySection />

      {/* SECTION 5 -- SERVICES / WHAT WE DO */}
      <ServicesSection />
    </div>
  );
}

export default Index;
