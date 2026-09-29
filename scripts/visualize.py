#!/usr/bin/env python3
"""
Turns the MapReduce output (results/output/<job>/part-00000) into graphs and
ranked summary tables.

Outputs:
  results/graphs/*.png      one chart per job
  results/summary/*.csv     ranked tables (top N / full monthly series)

Usage:
  python scripts/visualize.py [--top N]
"""
import argparse
import csv
import os
import string

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(ROOT, "results", "output")
GRAPH_DIR = os.path.join(ROOT, "results", "graphs")
SUMMARY_DIR = os.path.join(ROOT, "results", "summary")

BAR_COLOR = "#2a78d6"
TEXT = "#0b0b0b"
MUTED = "#52514e"
GRID = "#e4e3df"
SURFACE = "#fcfcfb"


def read_job(job, cast):
    rows = []
    with open(os.path.join(OUTPUT_DIR, job, "part-00000"), encoding="utf-8") as f:
        for line in f:
            key, _, value = line.rstrip("\n").rpartition("\t")
            rows.append((key, cast(value)))
    return rows


def write_summary(name, header, rows):
    os.makedirs(SUMMARY_DIR, exist_ok=True)
    with open(os.path.join(SUMMARY_DIR, name), "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(rows)


def money(v, _=None):
    if v >= 1e6:
        return f"£{v / 1e6:.1f}M"
    if v >= 1e3:
        return f"£{v / 1e3:.0f}K"
    return f"£{v:.0f}"


def count(v, _=None):
    return f"{v / 1e3:.0f}K" if v >= 1e3 else f"{v:.0f}"


def style_axes(ax, title, subtitle):
    ax.set_facecolor(SURFACE)
    for side in ("top", "right", "left"):
        ax.spines[side].set_visible(False)
    ax.spines["bottom"].set_color(GRID)
    ax.tick_params(colors=MUTED, length=0, labelsize=9)
    ax.set_title(title, loc="left", fontsize=13, fontweight="bold", color=TEXT, pad=22)
    ax.text(0, 1.02, subtitle, transform=ax.transAxes, fontsize=9, color=MUTED)


def barh_chart(rows, title, subtitle, fmt, filename, products=True):
    # Product descriptions are stored upper-case; show them in readable case
    labels = [string.capwords(k.lower()) if products else k for k, _ in rows][::-1]
    values = [v for _, v in rows][::-1]

    fig, ax = plt.subplots(figsize=(10, 0.45 * len(rows) + 1.6), facecolor=SURFACE)
    bars = ax.barh(labels, values, color=BAR_COLOR, height=0.7)
    style_axes(ax, title, subtitle)
    ax.xaxis.set_major_formatter(FuncFormatter(fmt))
    ax.grid(axis="x", color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    ax.tick_params(axis="y", labelcolor=TEXT)
    for bar, v in zip(bars, values):
        ax.text(bar.get_width(), bar.get_y() + bar.get_height() / 2, "  " + fmt(v),
                va="center", fontsize=8.5, color=MUTED)
    ax.set_xlim(0, max(values) * 1.12)
    fig.tight_layout()
    fig.savefig(os.path.join(GRAPH_DIR, filename), dpi=150)
    plt.close(fig)


def monthly_chart(rows, filename):
    months = [k for k, _ in rows]
    values = [v for _, v in rows]

    fig, ax = plt.subplots(figsize=(11, 5), facecolor=SURFACE)
    ax.plot(months, values, color=BAR_COLOR, linewidth=2, marker="o", markersize=5)
    style_axes(ax, "Monthly Revenue",
               "Dec 2010 – Dec 2011 · Dec 2011 covers only 1–9 Dec (dataset ends)")
    ax.yaxis.set_major_formatter(FuncFormatter(money))
    ax.grid(axis="y", color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    ax.set_ylim(0, max(values) * 1.15)

    peak = max(range(len(values)), key=values.__getitem__)
    ax.annotate(f"Peak {months[peak]}: {money(values[peak])}",
                (peak, values[peak]), xytext=(0, 10), textcoords="offset points",
                ha="center", fontsize=9, color=TEXT)
    ax.annotate(money(values[-1]) + " (partial)", (len(values) - 1, values[-1]),
                xytext=(-8, -4), textcoords="offset points", ha="right",
                fontsize=8.5, color=MUTED)
    fig.tight_layout()
    fig.savefig(os.path.join(GRAPH_DIR, filename), dpi=150)
    plt.close(fig)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--top", type=int, default=10, help="rows per ranking (default 10)")
    top = parser.parse_args().top
    os.makedirs(GRAPH_DIR, exist_ok=True)

    by_value = lambda kv: (-kv[1], kv[0])

    # 1. Sales by Product
    product_rev = sorted(read_job("sales_by_product", float), key=by_value)
    total_rev = sum(v for _, v in product_rev)
    write_summary("top_products_by_revenue.csv", ["rank", "product", "revenue", "share_pct"],
                  [(i, k, f"{v:.2f}", f"{100 * v / total_rev:.2f}")
                   for i, (k, v) in enumerate(product_rev[:top], 1)])
    barh_chart(product_rev[:top], f"Top {top} Products by Revenue",
               f"Total revenue across {len(product_rev):,} products: {money(total_rev)}",
               money, "1_sales_by_product.png")

    # 2. Sales by Country
    country_rev = sorted(read_job("sales_by_country", float), key=by_value)
    write_summary("revenue_by_country.csv", ["rank", "country", "revenue", "share_pct"],
                  [(i, k, f"{v:.2f}", f"{100 * v / total_rev:.2f}")
                   for i, (k, v) in enumerate(country_rev, 1)])
    uk_share = 100 * country_rev[0][1] / total_rev
    barh_chart(country_rev[:top], f"Top {top} Countries by Revenue",
               f"{country_rev[0][0]} accounts for {uk_share:.1f}% of revenue · "
               f"{len(country_rev)} countries in total",
               money, "2_sales_by_country.png", products=False)

    # 3. Top-Selling Products (quantity)
    product_qty = sorted(read_job("top_selling_products", int), key=by_value)
    total_qty = sum(v for _, v in product_qty)
    write_summary("top_products_by_quantity.csv", ["rank", "product", "units_sold", "share_pct"],
                  [(i, k, v, f"{100 * v / total_qty:.2f}")
                   for i, (k, v) in enumerate(product_qty[:top], 1)])
    barh_chart(product_qty[:top], f"Top {top} Products by Units Sold",
               f"Total units sold: {total_qty:,}",
               count, "3_top_selling_products.png")

    # 4. Monthly Sales
    monthly = sorted(read_job("monthly_sales", float))
    write_summary("monthly_revenue.csv", ["month", "revenue", "change_pct"],
                  [(m, f"{v:.2f}",
                    "" if i == 0 else f"{100 * (v - monthly[i - 1][1]) / monthly[i - 1][1]:.2f}")
                   for i, (m, v) in enumerate(monthly)])
    monthly_chart(monthly, "4_monthly_sales.png")

    print(f"Graphs  -> {GRAPH_DIR}")
    print(f"Tables  -> {SUMMARY_DIR}")
    print(f"\nTotal revenue: {money(total_rev)} ({total_rev:,.2f})")
    print(f"Top product by revenue : {product_rev[0][0]} ({money(product_rev[0][1])})")
    print(f"Top product by quantity: {product_qty[0][0]} ({product_qty[0][1]:,} units)")
    print(f"Top country            : {country_rev[0][0]} ({uk_share:.1f}%)")
    best = max(monthly, key=lambda kv: kv[1])
    print(f"Best month             : {best[0]} ({money(best[1])})")


if __name__ == "__main__":
    main()
