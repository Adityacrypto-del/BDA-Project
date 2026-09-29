#!/usr/bin/env bash
# Environment for the single-node Hadoop cluster. Source it in your shell:
#   source scripts/hadoop_env.sh
#
# Uses Homebrew's Hadoop/OpenJDK by default; override HADOOP_HOME / JAVA_HOME
# before sourcing to use another install (e.g. on Linux).

_PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"

if [[ -z "${HADOOP_HOME:-}" ]] && command -v brew >/dev/null; then
  export HADOOP_HOME="$(brew --prefix hadoop)/libexec"
fi
if [[ -z "${JAVA_HOME:-}" ]] && command -v brew >/dev/null; then
  export JAVA_HOME="$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home"
fi

# Hadoop's default config overlaid with this project's hadoop/conf/*.xml
export HADOOP_CONF_DIR="$HOME/.bda-hadoop/conf"
mkdir -p "$HADOOP_CONF_DIR"
cp -R "$HADOOP_HOME/etc/hadoop/." "$HADOOP_CONF_DIR/"
cp "$_PROJECT_ROOT"/hadoop/conf/*.xml "$HADOOP_CONF_DIR/"
echo "export JAVA_HOME=\"$JAVA_HOME\"" >> "$HADOOP_CONF_DIR/hadoop-env.sh"

export HADOOP_MAPRED_HOME="$HADOOP_HOME"
export PATH="$HADOOP_HOME/bin:$HADOOP_HOME/sbin:$JAVA_HOME/bin:$PATH"
unset _PROJECT_ROOT
