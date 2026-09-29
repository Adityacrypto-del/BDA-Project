#!/usr/bin/env bash
# Download the UCI Online Retail dataset into data/raw/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RAW="$ROOT/data/raw"
URL="https://archive.ics.uci.edu/static/public/352/online+retail.zip"

mkdir -p "$RAW"
echo "Downloading dataset from $URL ..."
curl -L -o "$RAW/online_retail.zip" "$URL"
unzip -o "$RAW/online_retail.zip" -d "$RAW"
echo "Done: $RAW/Online Retail.xlsx"
