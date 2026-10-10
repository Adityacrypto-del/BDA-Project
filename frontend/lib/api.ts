/* Client for the FastAPI backend in ../backend (uvicorn backend.main:app --port 8000). */
import snapshot from "./snapshot.json";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export type Summary = {
  total_revenue: number;
  total_units_sold: number;
  product_count: number;
  country_count: number;
  month_count: number;
  top_product_by_revenue: { product: string; revenue: number };
  top_product_by_quantity: { product: string; units_sold: number };
  top_country: { country: string; revenue: number; share_pct: number };
  best_month: { month: string; revenue: number };
  results_updated_at: string | null;
};

export type ProductRevenue = { rank: number; product: string; product_raw: string; revenue: number; share_pct: number };
export type ProductQuantity = { rank: number; product: string; product_raw: string; units_sold: number; share_pct: number };
export type Country = { rank: number; country: string; revenue: number; share_pct: number };
export type Month = { month: string; revenue: number; change_pct: number | null };
export type Graph = { name: string; url: string };

export type PipelineStatus = {
  status: "idle" | "running" | "succeeded" | "failed";
  mode: "local" | "hadoop" | null;
  started_at: string | null;
  finished_at: string | null;
  return_code: number | null;
  log_tail: string[];
};

export type Dataset = {
  summary: Summary;
  productsRevenue: ProductRevenue[];
  productsQuantity: ProductQuantity[];
  countries: Country[];
  monthly: Month[];
};

/** Results bundled at build time, shown when the backend is not reachable. */
export const SNAPSHOT = snapshot as Dataset;

export async function getJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store", ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function loadDataset(): Promise<Dataset> {
  const [summary, productsRevenue, productsQuantity, countries, monthly] = await Promise.all([
    getJSON<Summary>("/api/summary"),
    getJSON<ProductRevenue[]>("/api/products/revenue?top=10"),
    getJSON<ProductQuantity[]>("/api/products/quantity?top=10"),
    getJSON<Country[]>("/api/countries?top=50"),
    getJSON<Month[]>("/api/monthly"),
  ]);
  return { summary, productsRevenue, productsQuantity, countries, monthly };
}

export const searchProducts = (metric: "revenue" | "quantity", q: string, top = 10) =>
  getJSON<(ProductRevenue | ProductQuantity)[]>(
    `/api/products/${metric}?top=${top}${q ? `&search=${encodeURIComponent(q)}` : ""}`,
  );

export const getGraphs = () => getJSON<Graph[]>("/api/graphs");
export const getPipelineStatus = () => getJSON<PipelineStatus>("/api/pipeline/status");
export const runPipeline = (mode: "local" | "hadoop") =>
  getJSON<PipelineStatus>(`/api/pipeline/run?mode=${mode}`, { method: "POST" });

/* ---------------------------------------------------------- formatting -- */

export function money(v: number, digits?: number) {
  const a = Math.abs(v);
  if (a >= 1e6) return `£${(v / 1e6).toFixed(digits ?? 2)}M`;
  if (a >= 1e3) return `£${(v / 1e3).toFixed(digits ?? 1)}K`;
  return `£${v.toFixed(digits ?? 0)}`;
}

export const moneyFull = (v: number) =>
  v.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 });

export const count = (v: number) => Math.round(v).toLocaleString("en-GB");

export function compact(v: number) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return `${Math.round(v)}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"] as const;

/** "2011-11" -> "Nov '11" */
export function monthShort(m: string) {
  const [y, mm] = m.split("-");
  return `${MONTHS[Number(mm) - 1]} '${y.slice(2)}`;
}

export function monthParts(m: string) {
  const [y, mm] = m.split("-");
  return { year: y, month: MONTHS_FULL[Number(mm) - 1] };
}

/** "EIRE" is how the dataset names Ireland. */
export const countryName = (c: string) => (c === "EIRE" ? "Ireland (EIRE)" : c);
