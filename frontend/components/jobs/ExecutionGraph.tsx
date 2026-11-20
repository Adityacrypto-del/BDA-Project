"use client";

import type { JobDef, StageId } from "@/lib/mr-jobs";
import { count } from "@/lib/api";

type Node = { id: string; stage: StageId; x: number; y: number; label: string; sub: string };
type Edge = { from: string; to: string; records: number };

const W = 112;
const H = 58;

const kb = (b: number) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : b >= 1e3 ? `${(b / 1e3).toFixed(1)} KB` : `${b} B`);

function layout(job: JobDef): { nodes: Node[]; edges: Edge[] } {
  const c = job.counters;
  const top = 78;
  const mid = 170;
  const bot = 262;
  const nodes: Node[] = [
    { id: "input", stage: "input", x: 70, y: mid, label: "HDFS input", sub: `${count(c.mapInputRecords)} rows` },
    { id: "split0", stage: "split", x: 210, y: top, label: "Split 0", sub: "map task 0" },
    { id: "split1", stage: "split", x: 210, y: bot, label: "Split 1", sub: "map task 1" },
    { id: "map0", stage: "map", x: 360, y: top, label: "Mapper 0", sub: "mapper.py" },
    { id: "map1", stage: "map", x: 360, y: bot, label: "Mapper 1", sub: "mapper.py" },
    { id: "comb0", stage: "combine", x: 510, y: top, label: "Combiner 0", sub: "reducer.py" },
    { id: "comb1", stage: "combine", x: 510, y: bot, label: "Combiner 1", sub: "reducer.py" },
    { id: "shuffle", stage: "shuffle", x: 660, y: mid, label: "Shuffle & Sort", sub: `${count(c.reduceInputRecords)} records` },
    { id: "reduce", stage: "reduce", x: 800, y: mid, label: "Reducer", sub: `${count(c.reduceInputGroups)} keys` },
    { id: "output", stage: "output", x: 930, y: mid, label: "part-00000", sub: kb(c.hdfsBytesWritten) },
  ];
  const half = c.mapInputRecords / 2;
  const edges: Edge[] = [
    { from: "input", to: "split0", records: half },
    { from: "input", to: "split1", records: half },
    { from: "split0", to: "map0", records: half },
    { from: "split1", to: "map1", records: half },
    { from: "map0", to: "comb0", records: half },
    { from: "map1", to: "comb1", records: half },
    { from: "comb0", to: "shuffle", records: c.combineOutputRecords / 2 },
    { from: "comb1", to: "shuffle", records: c.combineOutputRecords / 2 },
    { from: "shuffle", to: "reduce", records: c.reduceInputRecords },
    { from: "reduce", to: "output", records: c.reduceOutputRecords },
  ];
  return { nodes, edges };
}

/** Line width grows with log(records) so the combiner's shrinkage is visible. */
const strokeFor = (records: number) => 1.2 + (6.5 * Math.log10(Math.max(records, 1))) / Math.log10(519_516);

export default function ExecutionGraph({
  job,
  active,
  onSelect,
}: {
  job: JobDef;
  active: StageId;
  onSelect: (s: StageId) => void;
}) {
  const { nodes, edges } = layout(job);
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const order: StageId[] = ["input", "split", "map", "combine", "shuffle", "reduce", "output"];
  const activeIdx = order.indexOf(active);

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <svg
        viewBox="0 0 1000 340"
        className="w-full min-w-[760px] h-auto select-none"
        role="img"
        aria-label={`Execution graph for ${job.title}: input, splits, mappers, combiners, shuffle, reducer, output`}
      >
        <defs>
          <marker id="mr-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="rgba(255,255,255,0.35)" />
          </marker>
          <marker id="mr-arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill={job.accent} />
          </marker>
        </defs>

        {/* lane labels */}
        <text x="285" y="26" className="fill-white/30" fontSize="11" fontFamily="ui-monospace, monospace" letterSpacing="2">
          MAP PHASE · 2 PARALLEL TASKS
        </text>
        <text x="610" y="26" className="fill-white/30" fontSize="11" fontFamily="ui-monospace, monospace" letterSpacing="2">
          REDUCE PHASE · 1 TASK
        </text>
        <line x1="585" y1="36" x2="585" y2="320" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 6" />

        {/* edges */}
        {edges.map((e) => {
          const a = byId[e.from];
          const b = byId[e.to];
          const x1 = a.x + W / 2;
          const x2 = b.x - W / 2 - 3;
          const mx = (x1 + x2) / 2;
          const d = `M${x1},${a.y} C${mx},${a.y} ${mx},${b.y} ${x2},${b.y}`;
          const stageIdx = order.indexOf(b.stage);
          const isActive = stageIdx === activeIdx;
          const isDone = stageIdx < activeIdx;
          const sw = strokeFor(e.records);
          return (
            <g key={`${e.from}-${e.to}`}>
              <path
                d={d}
                fill="none"
                stroke={isActive ? job.accent : isDone ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.12)"}
                strokeOpacity={isActive ? 0.25 : 1}
                strokeWidth={sw}
                markerEnd={isActive ? undefined : "url(#mr-arrow)"}
              />
              {isActive && (
                <path
                  d={d}
                  fill="none"
                  stroke={job.accent}
                  strokeWidth={Math.max(2, sw * 0.6)}
                  className="mr-flow"
                  markerEnd="url(#mr-arrow-active)"
                />
              )}
            </g>
          );
        })}

        {/* nodes */}
        {nodes.map((n) => {
          const idx = order.indexOf(n.stage);
          const isActive = idx === activeIdx;
          const isDone = idx < activeIdx;
          return (
            <g
              key={n.id}
              transform={`translate(${n.x - W / 2}, ${n.y - H / 2})`}
              onClick={() => onSelect(n.stage)}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`${n.label}: show ${n.stage} stage`}
              onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && onSelect(n.stage)}
            >
              {isActive && (
                <rect x={-5} y={-5} width={W + 10} height={H + 10} rx={18} fill="none" stroke={job.accent} strokeOpacity={0.35}>
                  <animate attributeName="stroke-opacity" values="0.15;0.6;0.15" dur="1.8s" repeatCount="indefinite" />
                </rect>
              )}
              <rect
                width={W}
                height={H}
                rx={14}
                fill={isActive ? job.accent : "#0a0a0a"}
                fillOpacity={isActive ? 0.14 : 1}
                stroke={isActive ? job.accent : isDone ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.14)"}
                strokeWidth={isActive ? 1.6 : 1}
              />
              <text
                x={W / 2}
                y={25}
                textAnchor="middle"
                fontSize="12.5"
                fontWeight={500}
                fill={isActive ? "#fff" : isDone ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.6)"}
              >
                {n.label}
              </text>
              <text
                x={W / 2}
                y={42}
                textAnchor="middle"
                fontSize="10"
                fontFamily="ui-monospace, monospace"
                fill={isActive ? job.accent : "rgba(255,255,255,0.38)"}
              >
                {n.sub}
              </text>
            </g>
          );
        })}

        {/* record-count rail under the graph */}
        {[
          { x: 360, label: `${count(job.counters.mapOutputRecords)} pairs out` },
          { x: 510, label: `${count(job.counters.combineOutputRecords)} after combine` },
          { x: 800, label: `${count(job.counters.reduceOutputRecords)} final keys` },
        ].map((t) => (
          <text
            key={t.x}
            x={t.x}
            y={322}
            textAnchor="middle"
            fontSize="10.5"
            fontFamily="ui-monospace, monospace"
            fill="rgba(255,255,255,0.45)"
          >
            {t.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
