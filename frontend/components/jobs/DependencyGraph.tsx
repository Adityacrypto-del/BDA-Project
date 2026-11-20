"use client";

import { useRouter } from "next/navigation";
import { JOBS, type JobDef } from "@/lib/mr-jobs";

type N = { id: string; x: number; y: number; label: string; sub: string; job?: JobDef };

const W = 124;
const H = 50;

export default function DependencyGraph({ current }: { current: JobDef }) {
  const router = useRouter();
  const jobYs = [52, 124, 196, 268];
  const nodes: N[] = [
    { id: "raw", x: 72, y: 160, label: "Online Retail.xlsx", sub: "541,909 rows" },
    { id: "clean", x: 222, y: 160, label: "clean_data.py", sub: "→ 519,516 rows" },
    { id: "hdfs", x: 372, y: 160, label: "HDFS input", sub: "hdfs dfs -put" },
    ...JOBS.map((j, i) => ({ id: j.slug, x: 530, y: jobYs[i], label: `Job ${j.number}`, sub: j.title, job: j })),
    { id: "results", x: 690, y: 160, label: "results/output", sub: "part-00000 × 4" },
    { id: "verify", x: 850, y: 70, label: "verify_results.py", sub: "pandas cross-check" },
    { id: "viz", x: 850, y: 160, label: "visualize.py", sub: "PNG graphs + CSV" },
    { id: "api", x: 850, y: 268, label: "FastAPI", sub: "/api/*" },
    { id: "web", x: 1005, y: 268, label: "This website", sub: "Next.js" },
  ];
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const edges: [string, string][] = [
    ["raw", "clean"],
    ["clean", "hdfs"],
    ...JOBS.flatMap((j) => [["hdfs", j.slug] as [string, string], [j.slug, "results"] as [string, string]]),
    ["results", "verify"],
    ["results", "viz"],
    ["results", "api"],
    ["viz", "api"],
    ["api", "web"],
  ];

  const onPath = (a: string, b: string) => {
    const others: string[] = JOBS.filter((j) => j.slug !== current.slug).map((j) => j.slug);
    return !others.includes(a) && !others.includes(b);
  };

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <svg viewBox="0 0 1080 330" className="w-full min-w-[760px] h-auto" role="img" aria-label="Project dependency graph">
        <defs>
          <marker id="dep-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="rgba(255,255,255,0.4)" />
          </marker>
          <marker id="dep-arrow-hl" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill={current.accent} />
          </marker>
        </defs>

        {edges.map(([f, t]) => {
          const a = byId[f];
          const b = byId[t];
          const vertical = Math.abs(a.x - b.x) < 10;
          const d = vertical
            ? `M${a.x},${a.y + H / 2} L${b.x},${b.y - H / 2 - 3}`
            : (() => {
                const x1 = a.x + W / 2;
                const x2 = b.x - W / 2 - 3;
                const mx = (x1 + x2) / 2;
                return `M${x1},${a.y} C${mx},${a.y} ${mx},${b.y} ${x2},${b.y}`;
              })();
          const hl = onPath(f, t);
          return (
            <path
              key={`${f}-${t}`}
              d={d}
              fill="none"
              stroke={hl ? current.accent : "rgba(255,255,255,0.1)"}
              strokeWidth={hl ? 1.8 : 1}
              strokeOpacity={hl ? 0.85 : 1}
              markerEnd={hl ? "url(#dep-arrow-hl)" : "url(#dep-arrow)"}
              className={hl ? "mr-flow-slow" : undefined}
            />
          );
        })}

        {nodes.map((n) => {
          const isCurrent = n.job?.slug === current.slug;
          const isOtherJob = !!n.job && !isCurrent;
          return (
            <g
              key={n.id}
              transform={`translate(${n.x - W / 2}, ${n.y - H / 2})`}
              className={isOtherJob ? "cursor-pointer" : undefined}
              onClick={isOtherJob ? () => router.push(`/jobs/${n.job!.slug}`) : undefined}
              role={isOtherJob ? "link" : undefined}
              tabIndex={isOtherJob ? 0 : undefined}
              aria-label={isOtherJob ? `Open job ${n.job!.number}: ${n.job!.title}` : undefined}
              onKeyDown={isOtherJob ? (e) => e.key === "Enter" && router.push(`/jobs/${n.job!.slug}`) : undefined}
            >
              <rect
                width={W}
                height={H}
                rx={12}
                fill={isCurrent ? current.accent : "#0a0a0a"}
                fillOpacity={isCurrent ? 0.15 : 1}
                stroke={isCurrent ? current.accent : n.job ? (n.job.accent as string) : "rgba(255,255,255,0.18)"}
                strokeOpacity={isOtherJob ? 0.35 : 1}
                strokeWidth={isCurrent ? 1.6 : 1}
              />
              <text
                x={W / 2}
                y={21}
                textAnchor="middle"
                fontSize="12"
                fontWeight={500}
                fill={isOtherJob ? "rgba(255,255,255,0.5)" : "#fff"}
              >
                {n.label}
              </text>
              <text
                x={W / 2}
                y={37}
                textAnchor="middle"
                fontSize="9.5"
                fontFamily="ui-monospace, monospace"
                fill={isCurrent ? current.accent : "rgba(255,255,255,0.4)"}
              >
                {n.sub}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
