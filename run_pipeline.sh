#!/usr/bin/env bash
# End-to-end pipeline:
#   download -> clean -> MapReduce (local or Hadoop) -> verify -> graphs
#
# Usage: ./run_pipeline.sh [local|hadoop]     (default: local)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
MODE="${1:-local}"
cd "$ROOT"

[[ -f "data/raw/Online Retail.xlsx" ]] || ./scripts/download_data.sh

echo "=== 1. Data cleaning ==="
python3 scripts/clean_data.py

echo "=== 2. MapReduce jobs ($MODE) ==="
case "$MODE" in
  local)  ./run_local.sh ;;
  hadoop) ./run_hadoop.sh ;;
  *) echo "Unknown mode: $MODE (use local or hadoop)"; exit 1 ;;
esac

echo "=== 3. Verifying results ==="
python3 scripts/verify_results.py

echo "=== 4. Graphs & summary tables ==="
python3 scripts/visualize.py
