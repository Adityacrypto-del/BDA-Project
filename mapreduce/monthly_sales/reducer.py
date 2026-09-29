#!/usr/bin/env python3
"""
Job: Monthly Sales Analysis
Reducer (also used as the Combiner)
  Input : <key> TAB <value>, sorted by key (Hadoop's shuffle & sort guarantees this)
  Output: <key> TAB <sum of values for that key>
"""
import sys


def emit(key, total):
    print(f"{key}\t{total:.2f}")


def main():
    current_key, total = None, 0
    for line in sys.stdin:
        key, sep, value = line.rstrip("\n").rpartition("\t")
        if not sep:
            continue
        try:
            value = float(value)
        except ValueError:
            continue
        if key == current_key:
            total += value
        else:
            if current_key is not None:
                emit(current_key, total)
            current_key, total = key, value
    if current_key is not None:
        emit(current_key, total)


if __name__ == "__main__":
    main()
