#!/usr/bin/env python3
"""
Runs every built-in HiveQL query and saves the results to
frontend/lib/hive-snapshot.json. The website shows these cached results
when the backend API is not running.

Usage (from the project root): python3 scripts/export_hive_snapshot.py
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.hive import HIVE_DDL, QUERIES, HiveEngine  # noqa: E402

data = ROOT / "data" / "cleaned" / "online_retail_clean.tsv"
engine = HiveEngine(data, data.with_suffix(".sqlite"))
snapshot = {
    "ddl": HIVE_DDL,
    "queries": QUERIES,
    "results": {q["id"]: engine.run(q["id"]) for q in QUERIES},
}
out = ROOT / "frontend" / "lib" / "hive-snapshot.json"
out.write_text(json.dumps(snapshot, indent=1) + "\n")
print(f"Wrote {len(QUERIES)} query results to {out}")
