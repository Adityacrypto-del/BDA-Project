"use client";

import { AuroraBackground } from "@/components/ui/aurora-background";
import { Countries } from "@/components/sections/countries";
import { Hero } from "@/components/sections/hero";
import { Monthly } from "@/components/sections/monthly";
import { Nav } from "@/components/sections/nav";
import { Overview } from "@/components/sections/overview";
import { RecordStream } from "@/components/sections/record-stream";
import { PipelineFlow } from "@/components/sections/pipeline-flow";
import { Products } from "@/components/sections/products";
import { Graphs, RunPipeline } from "@/components/sections/run-pipeline";
import { useDataset } from "@/lib/use-dataset";

export default function Home() {
  const { data, source, refresh } = useDataset();

  return (
    <main className="relative">
      <Nav source={source} />
      <Hero data={data} />
      <RecordStream data={data} />

      <div className="relative">
        <AuroraBackground className="opacity-60" />
        <Overview data={data} />
        <PipelineFlow data={data} />
      </div>

      <Monthly data={data} />

      <div className="relative">
        <AuroraBackground className="opacity-40" />
        <Products data={data} source={source} />
        <Countries data={data} />
        <RunPipeline source={source} onFinished={refresh} />
        <Graphs source={source} version={data.summary.results_updated_at} />
      </div>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-[12px] text-muted-foreground">
          <p>
            Data: Chen, D. (2015). <em>Online Retail</em>. UCI Machine Learning Repository.
          </p>
          <p className="font-mono">Hadoop 3.5 · Python streaming · FastAPI · Next.js</p>
        </div>
      </footer>
    </main>
  );
}
