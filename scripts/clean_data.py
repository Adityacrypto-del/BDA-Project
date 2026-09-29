#!/usr/bin/env python3
"""
Data cleaning step for the UCI Online Retail dataset.

Reads the raw Excel file and writes a tab-separated file that is ready to be
uploaded to HDFS and consumed by the Hadoop Streaming mappers.

Cleaning rules:
  1. Drop rows with a missing Description.
  2. Drop cancelled invoices (InvoiceNo starting with 'C') and the original
     order lines they reverse (same customer, stock code and quantity), so
     cancelled orders do not inflate revenue or quantity.
  3. Drop rows with Quantity <= 0 or UnitPrice <= 0 (returns, adjustments, free items).
  4. Drop non-product stock codes (postage, bank charges, manual adjustments, fees...).
  5. Drop exact duplicate rows.
  6. Normalise text fields (strip whitespace, remove tabs/newlines, upper-case descriptions).

Output columns (tab-separated, no header):
  InvoiceNo  StockCode  Description  Quantity  InvoiceDate  UnitPrice  CustomerID  Country

Usage:
  python scripts/clean_data.py [input.xlsx] [output.tsv]
"""
import os
import sys

import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_INPUT = os.path.join(ROOT, "data", "raw", "Online Retail.xlsx")
DEFAULT_OUTPUT = os.path.join(ROOT, "data", "cleaned", "online_retail_clean.tsv")
SAMPLE_OUTPUT = os.path.join(ROOT, "data", "sample", "online_retail_sample.tsv")

# Stock codes that are not real products
NON_PRODUCT_CODES = {
    "POST", "DOT", "M", "m", "C2", "D", "S", "B", "CRUK", "PADS",
    "BANK CHARGES", "AMAZONFEE", "ADJUST", "ADJUST2",
}

COLUMNS = ["InvoiceNo", "StockCode", "Description", "Quantity",
           "InvoiceDate", "UnitPrice", "CustomerID", "Country"]


def clean_text(series):
    return (series.astype(str)
            .str.replace(r"[\t\r\n]+", " ", regex=True)
            .str.strip())


def drop_reversed_orders(sales, cancellations):
    """Remove sale lines matched one-to-one by a cancellation line."""
    key = ["CustomerID", "StockCode", "AbsQty"]
    cancellations = cancellations.dropna(subset=["CustomerID"]).assign(
        AbsQty=cancellations["Quantity"].abs())
    cancel_counts = cancellations.groupby(key).size().rename("n_cancelled")

    sales = sales.assign(AbsQty=sales["Quantity"].abs())
    # Match the most recent sale lines first (a cancellation follows its order)
    sales = sales.sort_values("InvoiceDate", ascending=False, kind="stable")
    sales["nth"] = sales.groupby(key, dropna=False).cumcount()
    sales = sales.join(cancel_counts, on=key)
    reversed_line = sales["nth"] < sales["n_cancelled"].fillna(0)
    return (sales[~reversed_line]
            .drop(columns=["AbsQty", "nth", "n_cancelled"])
            .sort_index())


def clean(df):
    stats = {"raw_rows": len(df)}

    df = df.dropna(subset=["Description"])
    stats["after_missing_description"] = len(df)

    df = df.assign(InvoiceNo=clean_text(df["InvoiceNo"]),
                   StockCode=clean_text(df["StockCode"]))
    cancelled = df["InvoiceNo"].str.startswith("C")
    df = drop_reversed_orders(df[~cancelled], df[cancelled])
    stats["after_cancellations"] = len(df)

    df = df[(df["Quantity"] > 0) & (df["UnitPrice"] > 0)]
    stats["after_non_positive"] = len(df)

    df = df[~df["StockCode"].isin(NON_PRODUCT_CODES)]
    stats["after_non_product_codes"] = len(df)

    df = df.drop_duplicates()
    stats["after_duplicates"] = len(df)

    df = df.assign(
        Description=clean_text(df["Description"]).str.upper(),
        Country=clean_text(df["Country"]),
        InvoiceDate=pd.to_datetime(df["InvoiceDate"]).dt.strftime("%Y-%m-%d %H:%M"),
        CustomerID=df["CustomerID"].apply(
            lambda x: str(int(x)) if pd.notna(x) else "UNKNOWN"),
        UnitPrice=df["UnitPrice"].round(2),
    )
    return df[COLUMNS], stats


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_INPUT
    dst = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUTPUT

    if not os.path.exists(src):
        sys.exit(f"Input not found: {src}\nRun scripts/download_data.sh first.")

    print(f"Reading {src} (this can take a minute)...")
    raw = pd.read_excel(src, dtype={"InvoiceNo": str, "StockCode": str})
    df, stats = clean(raw)

    os.makedirs(os.path.dirname(dst), exist_ok=True)
    df.to_csv(dst, sep="\t", header=False, index=False)

    # Small sample so the pipeline can be tried without downloading the dataset
    os.makedirs(os.path.dirname(SAMPLE_OUTPUT), exist_ok=True)
    df.sample(n=min(5000, len(df)), random_state=42).to_csv(
        SAMPLE_OUTPUT, sep="\t", header=False, index=False)

    print("\nCleaning summary")
    print("-" * 40)
    for key, value in stats.items():
        print(f"{key:<28}{value:>10,}")
    print(f"{'rows removed':<28}{stats['raw_rows'] - stats['after_duplicates']:>10,}")
    print(f"\nWrote {dst}")
    print(f"Wrote {SAMPLE_OUTPUT}")


if __name__ == "__main__":
    main()
