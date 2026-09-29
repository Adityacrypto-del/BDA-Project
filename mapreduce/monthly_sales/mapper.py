#!/usr/bin/env python3
"""
Job: Monthly Sales Analysis (total revenue per month)
Mapper
  Input : one cleaned transaction per line (tab-separated)
          InvoiceNo, StockCode, Description, Quantity, InvoiceDate, UnitPrice, CustomerID, Country
  Output: <YYYY-MM> TAB <revenue = Quantity * UnitPrice>
"""
import sys


def main():
    for line in sys.stdin:
        fields = line.rstrip("\n").split("\t")
        if len(fields) != 8:
            continue  # skip malformed lines
        _, _, description, quantity, invoice_date, unit_price, _, country = fields
        try:
            quantity = int(quantity)
            unit_price = float(unit_price)
        except ValueError:
            continue  # skip header or corrupt numeric values
        month = invoice_date[:7]  # "2010-12-01 08:26" -> "2010-12"
        print(f"{month}\t{quantity * unit_price:.2f}")


if __name__ == "__main__":
    main()
