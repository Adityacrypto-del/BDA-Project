"""
REST API backend for the E-Commerce Sales Analysis project.

Serves the Hadoop MapReduce results (results/output/<job>/part-00000) as JSON
so a frontend can display them, and lets a client re-run the pipeline.

Run from the project root:
    uvicorn backend.main:app --reload --port 8000

Interactive API docs: http://localhost:8000/docs
"""
import os
import subprocess
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_RESULTS_DIR = Path(os.environ.get("RETAIL_RESULTS_DIR", ROOT / "results"))
CORS_ORIGINS = os.environ.get("RETAIL_CORS_ORIGINS", "*").split(",")

JOBS = {
    "sales_by_product": float,
    "sales_by_country": float,
    "top_selling_products": int,
    "monthly_sales": float,
}


class ResultStore:
    """Reads MapReduce output files and caches them until they change on disk."""

    def __init__(self, results_dir: Path):
        self.output_dir = Path(results_dir) / "output"
        self._cache = {}

    def path(self, job):
        return self.output_dir / job / "part-00000"

    def load(self, job):
        """Return {key: value} for a job, re-reading only if the file changed."""
        path = self.path(job)
        if not path.exists():
            raise HTTPException(
                status_code=503,
                detail=f"No results for '{job}' yet. Run the pipeline first "
                       f"(POST /api/pipeline/run or ./run_pipeline.sh).")
        mtime = path.stat().st_mtime
        cached = self._cache.get(job)
        if cached and cached[0] == mtime:
            return cached[1]

        cast = JOBS[job]
        data = {}
        with open(path, encoding="utf-8") as f:
            for line in f:
                key, sep, value = line.rstrip("\n").rpartition("\t")
                if sep:
                    data[key] = cast(value)
        self._cache[job] = (mtime, data)
        return data

    def last_updated(self):
        times = [self.path(j).stat().st_mtime for j in JOBS if self.path(j).exists()]
        if not times:
            return None
        return datetime.fromtimestamp(max(times), tz=timezone.utc).isoformat()


class PipelineRunner:
    """Runs the pipeline in a background thread; one run at a time."""

    def __init__(self, command_for_mode):
        self.command_for_mode = command_for_mode
        self._lock = threading.Lock()
        self.state = {"status": "idle", "mode": None, "started_at": None,
                      "finished_at": None, "return_code": None, "log_tail": []}

    def start(self, mode):
        if not self._lock.acquire(blocking=False):
            raise HTTPException(status_code=409, detail="Pipeline is already running.")
        self.state = {"status": "running", "mode": mode, "started_at": _now(),
                      "finished_at": None, "return_code": None, "log_tail": []}
        threading.Thread(target=self._run, args=(mode,), daemon=True).start()
        return self.state

    def _run(self, mode):
        try:
            proc = subprocess.Popen(self.command_for_mode(mode), cwd=ROOT, text=True,
                                    stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
            for line in proc.stdout:
                self.state["log_tail"] = (self.state["log_tail"] + [line.rstrip()])[-50:]
            proc.wait()
            self.state["return_code"] = proc.returncode
            self.state["status"] = "succeeded" if proc.returncode == 0 else "failed"
        except Exception as exc:  # e.g. script missing or not executable
            self.state["log_tail"].append(f"error: {exc}")
            self.state["status"] = "failed"
        finally:
            self.state["finished_at"] = _now()
            self._lock.release()


def _now():
    return datetime.now(timezone.utc).isoformat()


def _pretty(name):
    """'WHITE HANGING HEART' -> 'White Hanging Heart' (descriptions are upper-case)."""
    return " ".join(w.capitalize() for w in name.lower().split())


def _ranked(data, top, search=None):
    items = data.items()
    if search:
        items = [(k, v) for k, v in items if search.lower() in k.lower()]
    return sorted(items, key=lambda kv: (-kv[1], kv[0]))[:top]


def _default_command(mode):
    return [str(ROOT / "run_pipeline.sh"), mode]


def create_app(results_dir: Path = DEFAULT_RESULTS_DIR, pipeline_command=_default_command):
    store = ResultStore(results_dir)
    runner = PipelineRunner(pipeline_command)

    app = FastAPI(
        title="E-Commerce Sales Analysis API",
        description="Hadoop MapReduce results for the UCI Online Retail dataset.",
        version="1.0.0",
    )
    app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS,
                       allow_methods=["*"], allow_headers=["*"])

    graphs_dir = Path(results_dir) / "graphs"
    graphs_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/graphs", StaticFiles(directory=graphs_dir), name="graphs")

    @app.get("/api/health", tags=["meta"])
    def health():
        available = [j for j in JOBS if store.path(j).exists()]
        return {"status": "ok", "jobs_available": available,
                "results_updated_at": store.last_updated()}

    @app.get("/api/summary", tags=["results"])
    def summary():
        product_rev = store.load("sales_by_product")
        product_qty = store.load("top_selling_products")
        country_rev = store.load("sales_by_country")
        monthly = store.load("monthly_sales")

        total_revenue = sum(product_rev.values())
        top_product = _ranked(product_rev, 1)[0]
        top_seller = _ranked(product_qty, 1)[0]
        top_country = _ranked(country_rev, 1)[0]
        best_month = _ranked(monthly, 1)[0]
        return {
            "total_revenue": round(total_revenue, 2),
            "total_units_sold": sum(product_qty.values()),
            "product_count": len(product_rev),
            "country_count": len(country_rev),
            "month_count": len(monthly),
            "top_product_by_revenue": {"product": _pretty(top_product[0]),
                                       "revenue": top_product[1]},
            "top_product_by_quantity": {"product": _pretty(top_seller[0]),
                                        "units_sold": top_seller[1]},
            "top_country": {"country": top_country[0], "revenue": top_country[1],
                            "share_pct": round(100 * top_country[1] / total_revenue, 2)},
            "best_month": {"month": best_month[0], "revenue": best_month[1]},
            "results_updated_at": store.last_updated(),
        }

    @app.get("/api/products/revenue", tags=["results"])
    def products_by_revenue(top: int = Query(10, ge=1, le=5000),
                            search: Optional[str] = Query(None, min_length=1)):
        """Job 1 - Sales by Product: products ranked by total revenue."""
        data = store.load("sales_by_product")
        total = sum(data.values())
        return [{"rank": i, "product": _pretty(k), "product_raw": k, "revenue": v,
                 "share_pct": round(100 * v / total, 2)}
                for i, (k, v) in enumerate(_ranked(data, top, search), 1)]

    @app.get("/api/products/quantity", tags=["results"])
    def products_by_quantity(top: int = Query(10, ge=1, le=5000),
                             search: Optional[str] = Query(None, min_length=1)):
        """Job 3 - Top-Selling Products: products ranked by units sold."""
        data = store.load("top_selling_products")
        total = sum(data.values())
        return [{"rank": i, "product": _pretty(k), "product_raw": k, "units_sold": v,
                 "share_pct": round(100 * v / total, 2)}
                for i, (k, v) in enumerate(_ranked(data, top, search), 1)]

    @app.get("/api/countries", tags=["results"])
    def countries(top: int = Query(50, ge=1, le=500)):
        """Job 2 - Sales by Country: countries ranked by total revenue."""
        data = store.load("sales_by_country")
        total = sum(data.values())
        return [{"rank": i, "country": k, "revenue": v,
                 "share_pct": round(100 * v / total, 2)}
                for i, (k, v) in enumerate(_ranked(data, top), 1)]

    @app.get("/api/monthly", tags=["results"])
    def monthly():
        """Job 4 - Monthly Sales: revenue per month with month-over-month change."""
        data = sorted(store.load("monthly_sales").items())
        rows, prev = [], None
        for month, revenue in data:
            change = None if prev is None else round(100 * (revenue - prev) / prev, 2)
            rows.append({"month": month, "revenue": revenue, "change_pct": change})
            prev = revenue
        return rows

    @app.get("/api/graphs", tags=["results"])
    def graphs():
        """URLs of the generated Matplotlib charts."""
        return [{"name": p.stem, "url": f"/graphs/{p.name}"}
                for p in sorted(graphs_dir.glob("*.png"))]

    @app.post("/api/pipeline/run", status_code=202, tags=["pipeline"])
    def run_pipeline(mode: Literal["local", "hadoop"] = "local"):
        """Start clean -> MapReduce -> verify -> graphs in the background."""
        return runner.start(mode)

    @app.get("/api/pipeline/status", tags=["pipeline"])
    def pipeline_status():
        return runner.state

    return app


app = create_app()
