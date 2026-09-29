#!/usr/bin/env bash
# Stops the single-node Hadoop cluster started by hadoop_start.sh.
set -uo pipefail
source "$(dirname "$0")/hadoop_env.sh"

mapred --daemon stop historyserver
yarn --daemon stop nodemanager
yarn --daemon stop resourcemanager
hdfs --daemon stop datanode
hdfs --daemon stop namenode
echo "Hadoop stopped."
