#!/usr/bin/env bash
# Starts a single-node Hadoop cluster (HDFS + YARN + JobHistory).
# Formats the NameNode the first time it runs. No SSH needed.
#
# Web UIs once running:
#   HDFS NameNode    http://localhost:9870
#   YARN jobs        http://localhost:8088
#   Job history      http://localhost:19888
set -euo pipefail
source "$(dirname "$0")/hadoop_env.sh"

if [[ ! -d "$HOME/hadoop-data/dfs/name" ]]; then
  echo ">> Formatting NameNode (first run)"
  hdfs namenode -format -nonInteractive -force >/dev/null
fi

echo ">> Starting HDFS"
hdfs --daemon start namenode
hdfs --daemon start datanode
echo ">> Starting YARN"
yarn --daemon start resourcemanager
yarn --daemon start nodemanager
echo ">> Starting JobHistory server"
mapred --daemon start historyserver

echo ">> Waiting for HDFS to leave safe mode"
hdfs dfsadmin -safemode wait >/dev/null

jps | grep -E "NameNode|DataNode|ResourceManager|NodeManager|JobHistoryServer" || true
echo
echo "HDFS UI:        http://localhost:9870"
echo "YARN UI:        http://localhost:8088"
echo "Job history UI: http://localhost:19888"
