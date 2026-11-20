/*
 * The four Hadoop Streaming jobs, their real counters from results/hadoop_run_log.txt,
 * and a small in-browser re-implementation of mapper -> combiner -> shuffle -> reducer
 * that traces a handful of real cleaned rows through each job.
 */

export type JobSlug = "sales_by_product" | "sales_by_country" | "top_selling_products" | "monthly_sales";

export type Counters = {
  appId: string;
  wallSeconds: number;
  hdfsBytesRead: number;
  hdfsBytesWritten: number;
  mapTasks: number;
  reduceTasks: number;
  mapTimeMs: number;
  reduceTimeMs: number;
  mapInputRecords: number;
  mapOutputRecords: number;
  mapOutputBytes: number;
  combineInputRecords: number;
  combineOutputRecords: number;
  reduceInputGroups: number;
  reduceShuffleBytes: number;
  reduceInputRecords: number;
  reduceOutputRecords: number;
};

export type JobDef = {
  slug: JobSlug;
  number: string;
  title: string;
  question: string;
  keyLabel: string;
  valueLabel: string;
  /** How the mapper turns a row into a key. */
  keyExpr: string;
  valueExpr: string;
  /** Integer sums (units) vs money sums. */
  integer: boolean;
  accent: string;
  counters: Counters;
  takeaway: string;
};

const COMMON = {
  hdfsBytesRead: 44_602_625,
  mapTasks: 2,
  reduceTasks: 1,
  mapInputRecords: 519_516,
  mapOutputRecords: 519_516,
  combineInputRecords: 519_516,
};

export const JOBS: JobDef[] = [
  {
    slug: "sales_by_product",
    number: "01",
    title: "Sales by Product",
    question: "Which products generate the highest revenue?",
    keyLabel: "Description",
    valueLabel: "Quantity × UnitPrice",
    keyExpr: "fields[2]  # Description",
    valueExpr: "quantity * unit_price",
    integer: false,
    accent: "#7dd3fc",
    takeaway: "Revenue is spread thinly: the top product, Regency Cakestand 3 Tier, earns under 2% of the total.",
    counters: {
      ...COMMON,
      appId: "application_1790675894475_0005",
      wallSeconds: 15,
      hdfsBytesWritten: 140_692,
      mapTimeMs: 8_850,
      reduceTimeMs: 2_325,
      mapOutputBytes: 17_173_742,
      combineOutputRecords: 6_950,
      reduceInputGroups: 3_998,
      reduceShuffleBytes: 256_882,
      reduceInputRecords: 6_950,
      reduceOutputRecords: 3_998,
    },
  },
  {
    slug: "sales_by_country",
    number: "02",
    title: "Sales by Country",
    question: "Which countries generate the most revenue?",
    keyLabel: "Country",
    valueLabel: "Quantity × UnitPrice",
    keyExpr: "fields[7]  # Country",
    valueExpr: "quantity * unit_price",
    integer: false,
    accent: "#fcd34d",
    takeaway: "The United Kingdom brings in 84.7% of revenue; the other 37 countries share the remaining 15.3%.",
    counters: {
      ...COMMON,
      appId: "application_1790675894475_0006",
      wallSeconds: 19,
      hdfsBytesWritten: 674,
      mapTimeMs: 8_684,
      reduceTimeMs: 2_353,
      mapOutputBytes: 10_344_173,
      combineOutputRecords: 70,
      reduceInputGroups: 38,
      reduceShuffleBytes: 1_380,
      reduceInputRecords: 70,
      reduceOutputRecords: 38,
    },
  },
  {
    slug: "top_selling_products",
    number: "03",
    title: "Top-Selling Products",
    question: "Which products sell the most units?",
    keyLabel: "Description",
    valueLabel: "Quantity",
    keyExpr: "fields[2]  # Description",
    valueExpr: "quantity",
    integer: true,
    accent: "#6ee7b7",
    takeaway: "Cheap items lead on volume: World War 2 Gliders sold 54,711 units, while the top earner ranks outside the top 10.",
    counters: {
      ...COMMON,
      appId: "application_1790675894475_0007",
      wallSeconds: 18,
      hdfsBytesWritten: 127_577,
      mapTimeMs: 8_915,
      reduceTimeMs: 2_412,
      mapOutputBytes: 15_508_407,
      combineOutputRecords: 6_950,
      reduceInputGroups: 3_998,
      reduceShuffleBytes: 234_084,
      reduceInputRecords: 6_950,
      reduceOutputRecords: 3_998,
    },
  },
  {
    slug: "monthly_sales",
    number: "04",
    title: "Monthly Sales",
    question: "How does revenue change month by month?",
    keyLabel: "YYYY-MM",
    valueLabel: "Quantity × UnitPrice",
    keyExpr: "invoice_date[:7]  # '2010-12-01 08:26' -> '2010-12'",
    valueExpr: "quantity * unit_price",
    integer: false,
    accent: "#f0abfc",
    takeaway: "Revenue is flat until August 2011, then climbs to a £1.44M peak in November 2011 before Christmas.",
    counters: {
      ...COMMON,
      appId: "application_1790675894475_0008",
      wallSeconds: 19,
      hdfsBytesWritten: 237,
      mapTimeMs: 8_595,
      reduceTimeMs: 2_359,
      mapOutputBytes: 7_019_940,
      combineOutputRecords: 14,
      reduceInputGroups: 13,
      reduceShuffleBytes: 295,
      reduceInputRecords: 14,
      reduceOutputRecords: 13,
    },
  },
];

export const getJob = (slug: string) => JOBS.find((j) => j.slug === slug);

/* ------------------------------------------------------------- sample trace -- */

/** Eight real rows from data/cleaned/online_retail_clean.tsv, chosen so keys repeat. */
export type Row = {
  invoice: string;
  stock: string;
  description: string;
  quantity: number;
  date: string;
  price: number;
  customer: string;
  country: string;
};

const RAW_ROWS = [
  "536365\t85123A\tWHITE HANGING HEART T-LIGHT HOLDER\t6\t2010-12-01 08:26\t2.55\t17850\tUnited Kingdom",
  "574068\t85099B\tJUMBO BAG RED RETROSPOT\t20\t2011-11-02 14:51\t2.08\t12490\tFrance",
  "573822\t22423\tREGENCY CAKESTAND 3 TIER\t4\t2011-11-01 11:33\t12.75\t15527\tUnited Kingdom",
  "578472\t85123A\tWHITE HANGING HEART T-LIGHT HOLDER\t12\t2011-11-24 12:40\t2.95\t12476\tGermany",
  "536409\t85099B\tJUMBO BAG RED RETROSPOT\t2\t2010-12-01 11:45\t1.95\t17908\tUnited Kingdom",
  "537065\t22423\tREGENCY CAKESTAND 3 TIER\t2\t2010-12-05 11:57\t12.75\t12567\tFrance",
  "573808\t85123A\tWHITE HANGING HEART T-LIGHT HOLDER\t6\t2011-11-01 11:29\t2.95\t14419\tUnited Kingdom",
  "536967\t85099B\tJUMBO BAG RED RETROSPOT\t30\t2010-12-03 12:57\t1.95\t12600\tGermany",
];

export const SAMPLE_ROWS: Row[] = RAW_ROWS.map((line) => {
  const [invoice, stock, description, quantity, date, price, customer, country] = line.split("\t");
  return { invoice, stock, description, quantity: Number(quantity), date, price: Number(price), customer, country };
});

/** Hadoop gives each map task one input split; here rows 0-3 and 4-7. */
export const SPLITS: Row[][] = [SAMPLE_ROWS.slice(0, 4), SAMPLE_ROWS.slice(4)];

export type KV = { key: string; value: number };

export type Trace = {
  mapped: KV[][]; // per split, in input order
  combined: KV[][]; // per split, sorted + summed
  grouped: { key: string; values: number[] }[]; // after shuffle & sort
  reduced: KV[];
};

const round2 = (v: number) => Math.round(v * 100) / 100;

export function mapRow(job: JobDef, r: Row): KV {
  const key =
    job.slug === "sales_by_country" ? r.country : job.slug === "monthly_sales" ? r.date.slice(0, 7) : r.description;
  const value = job.slug === "top_selling_products" ? r.quantity : round2(r.quantity * r.price);
  return { key, value };
}

/** Byte-order compare, like LC_ALL=C sort and Hadoop's key comparator (inputs are ASCII). */
const byKey = (a: { key: string }, b: { key: string }) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

function sumSorted(kvs: KV[]): KV[] {
  const out: KV[] = [];
  for (const kv of [...kvs].sort(byKey)) {
    const last = out[out.length - 1];
    if (last && last.key === kv.key) last.value = round2(last.value + kv.value);
    else out.push({ ...kv });
  }
  return out;
}

export function traceJob(job: JobDef): Trace {
  const mapped = SPLITS.map((split) => split.map((r) => mapRow(job, r)));
  const combined = mapped.map(sumSorted);
  const groups = new Map<string, number[]>();
  for (const kv of combined.flat().sort(byKey)) {
    groups.set(kv.key, [...(groups.get(kv.key) ?? []), kv.value]);
  }
  const grouped = [...groups.entries()].map(([key, values]) => ({ key, values }));
  const reduced = grouped.map(({ key, values }) => ({ key, value: round2(values.reduce((a, b) => a + b, 0)) }));
  return { mapped, combined, grouped, reduced };
}

export const fmtValue = (job: JobDef, v: number) => (job.integer ? String(v) : v.toFixed(2));

/* ----------------------------------------------------------- stage graph -- */

export type StageId = "input" | "split" | "map" | "combine" | "shuffle" | "reduce" | "output";

export const STAGES: { id: StageId; label: string; short: string }[] = [
  { id: "input", label: "HDFS input", short: "Input" },
  { id: "split", label: "Input splits", short: "Split" },
  { id: "map", label: "Mapper", short: "Map" },
  { id: "combine", label: "Combiner", short: "Combine" },
  { id: "shuffle", label: "Shuffle & Sort", short: "Shuffle" },
  { id: "reduce", label: "Reducer", short: "Reduce" },
  { id: "output", label: "HDFS output", short: "Output" },
];

export const HDFS_INPUT = "/user/$USER/retail/input/online_retail_clean.tsv";

export function hadoopCommand(job: JobDef) {
  return [
    "hadoop jar $HADOOP_HOME/share/hadoop/tools/lib/hadoop-streaming-*.jar \\",
    `  -D mapreduce.job.name="retail-${job.slug}" \\`,
    `  -files mapreduce/${job.slug}/mapper.py,mapreduce/${job.slug}/reducer.py \\`,
    '  -mapper   "python3 mapper.py" \\',
    '  -combiner "python3 reducer.py" \\',
    '  -reducer  "python3 reducer.py" \\',
    "  -input  /user/$USER/retail/input \\",
    `  -output /user/$USER/retail/output/${job.slug}`,
  ].join("\n");
}
