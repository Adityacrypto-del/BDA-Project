#!/usr/bin/env python3
"""
Cross-checks the MapReduce output against the same aggregations computed
directly with pandas. Every key and every total must match.

Usage:
  python scripts/verify_results.py [cleaned_input.tsv]
"""
import os
import sys

import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_INPUT = os.path.join(ROOT, "data", "cleaned", "online_retail_clean.tsv")
OUTPUT_DIR = os.path.join(ROOT, "results", "output")
COLUMNS = ["InvoiceNo", "StockCode", "Description", "Quantity",
           "InvoiceDate", "UnitPrice", "CustomerID", "Country"]


def load_mr_output(job):
    path = os.path.join(OUTPUT_DIR, job, "part-00000")
    return pd.read_csv(path, sep="\t", header=None, names=["key", "value"],
                       keep_default_na=False, quoting=3).set_index("key")["value"]


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_INPUT
    df = pd.read_csv(src, sep="\t", header=None, names=COLUMNS,
                     keep_default_na=False, quoting=3,
                     dtype={"Description": str, "Country": str})
    # Mirror the mapper: revenue is rounded to 2 decimals per record
    df["Revenue"] = (df["Quantity"] * df["UnitPrice"]).round(2)
    df["Month"] = df["InvoiceDate"].str[:7]

    expected = {
        "sales_by_product": df.groupby("Description")["Revenue"].sum(),
        "sales_by_country": df.groupby("Country")["Revenue"].sum(),
        "top_selling_products": df.groupby("Description")["Quantity"].sum(),
        "monthly_sales": df.groupby("Month")["Revenue"].sum(),
    }

    failed = False
    for job, exp in expected.items():
        got = load_mr_output(job)
        missing = set(exp.index) ^ set(got.index)
        diff = (got.reindex(exp.index) - exp).abs()
        bad = diff[diff > 0.01]
        ok = not missing and bad.empty
        failed |= not ok
        print(f"[{'PASS' if ok else 'FAIL'}] {job:<22} keys={len(got):>5}  "
              f"key mismatches={len(missing)}  value mismatches={len(bad)}")

    print(f"\nTotal revenue (cleaned data): {df['Revenue'].sum():,.2f}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
