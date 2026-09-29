#!/usr/bin/env bash
# Simulates the Hadoop Streaming pipeline locally with Unix pipes:
#
#   input  ->  mapper.py  ->  sort (shuffle & sort)  ->  reducer.py  ->  part-00000
#
# Useful for development/testing on a machine without Hadoop. Produces the
# same output layout as run_hadoop.sh (results/output/<job>/part-00000).
#
# Usage: ./run_local.sh [input.tsv]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
INPUT="${1:-$ROOT/data/cleaned/online_retail_clean.tsv}"
OUT="$ROOT/results/output"
JOBS=(sales_by_product sales_by_country top_selling_products monthly_sales)

[[ -f "$INPUT" ]] || { echo "Input not found: $INPUT (run scripts/clean_data.py first)"; exit 1; }

for job in "${JOBS[@]}"; do
  echo ">> Running $job"
  mkdir -p "$OUT/$job"
  start=$(date +%s)
  # LC_ALL=C gives byte-order sorting, matching Hadoop's key comparator
  python3 "$ROOT/mapreduce/$job/mapper.py" < "$INPUT" \
    | LC_ALL=C sort -t $'\t' -k1,1 \
    | python3 "$ROOT/mapreduce/$job/reducer.py" \
    > "$OUT/$job/part-00000"
  echo "   $(wc -l < "$OUT/$job/part-00000" | tr -d ' ') keys written in $(( $(date +%s) - start ))s -> $OUT/$job/part-00000"
done
