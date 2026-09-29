#!/usr/bin/env bash
# Runs the four MapReduce jobs on a Hadoop cluster (or pseudo-distributed
# single node) using Hadoop Streaming, then copies the results back to
# results/output/<job>/part-00000.
#
# Usage: ./run_hadoop.sh [local_input.tsv]
#
# Environment overrides:
#   HDFS_BASE        HDFS working dir          (default /user/$USER/retail)
#   STREAMING_JAR    path to hadoop-streaming  (auto-detected from $HADOOP_HOME)
#   NUM_REDUCERS     reducers per job          (default 1)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
INPUT="${1:-$ROOT/data/cleaned/online_retail_clean.tsv}"
HDFS_BASE="${HDFS_BASE:-/user/$USER/retail}"
HDFS_INPUT="$HDFS_BASE/input"
NUM_REDUCERS="${NUM_REDUCERS:-1}"
OUT="$ROOT/results/output"
JOBS=(sales_by_product sales_by_country top_selling_products monthly_sales)

# Use the project's single-node setup (scripts/hadoop_env.sh) unless Hadoop
# is already configured in this shell
if [[ -z "${HADOOP_CONF_DIR:-}" && -f "$ROOT/scripts/hadoop_env.sh" ]]; then
  source "$ROOT/scripts/hadoop_env.sh"
fi
command -v hadoop >/dev/null || { echo "hadoop not found on PATH"; exit 1; }
[[ -f "$INPUT" ]] || { echo "Input not found: $INPUT (run scripts/clean_data.py first)"; exit 1; }

if [[ -z "${STREAMING_JAR:-}" ]]; then
  STREAMING_JAR=$(ls "${HADOOP_HOME:?set HADOOP_HOME or STREAMING_JAR}"/share/hadoop/tools/lib/hadoop-streaming-*.jar | head -n 1)
fi
echo "Using streaming jar: $STREAMING_JAR"

# 1. Load the cleaned dataset into HDFS
echo ">> Uploading $INPUT to hdfs://$HDFS_INPUT"
hdfs dfs -mkdir -p "$HDFS_INPUT"
hdfs dfs -put -f "$INPUT" "$HDFS_INPUT/"
hdfs dfs -ls "$HDFS_INPUT"

# 2. Run each MapReduce job
for job in "${JOBS[@]}"; do
  job_dir="$ROOT/mapreduce/$job"
  hdfs_out="$HDFS_BASE/output/$job"
  echo ">> Running $job"
  hdfs dfs -rm -r -f -skipTrash "$hdfs_out" >/dev/null

  hadoop jar "$STREAMING_JAR" \
    -D mapreduce.job.name="retail-$job" \
    -D mapreduce.job.reduces="$NUM_REDUCERS" \
    -files "$job_dir/mapper.py,$job_dir/reducer.py" \
    -mapper "python3 mapper.py" \
    -combiner "python3 reducer.py" \
    -reducer "python3 reducer.py" \
    -input "$HDFS_INPUT" \
    -output "$hdfs_out"

  # 3. Fetch results back to the local filesystem
  mkdir -p "$OUT/$job"
  hdfs dfs -cat "$hdfs_out/part-*" > "$OUT/$job/part-00000"
  echo "   -> $OUT/$job/part-00000"
done

echo "All jobs finished. Run: python3 scripts/visualize.py"
