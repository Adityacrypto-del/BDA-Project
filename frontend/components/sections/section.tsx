import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

export function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
  className,
}: {
  id: string;
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("relative mx-auto max-w-6xl scroll-mt-20 px-4 py-24", className)}>
      <Reveal className="mb-10 max-w-2xl">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        <h2 className="font-display text-[clamp(2rem,5vw,3.4rem)] leading-[1.02] tracking-tight">{title}</h2>
        {lede && <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{lede}</p>}
      </Reveal>
      {children}
    </section>
  );
}
