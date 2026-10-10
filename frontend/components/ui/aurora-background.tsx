import { cn } from "@/lib/utils";

/** Slow drifting colour fields over a panning grid. Purely decorative. */
export function AuroraBackground({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="aurora-blob absolute -left-[10%] top-[5%] h-[45vmax] w-[45vmax] rounded-full bg-[#2b5cff]/25" />
      <div className="aurora-blob absolute right-[-15%] top-[25%] h-[40vmax] w-[40vmax] rounded-full bg-[#1fb89c]/18 [animation-delay:-6s]" />
      <div className="aurora-blob absolute bottom-[-20%] left-[25%] h-[38vmax] w-[38vmax] rounded-full bg-[#8a5cff]/18 [animation-delay:-12s]" />
    </div>
  );
}
