#!/usr/bin/env python3
"""
Job: Top-Selling Products (total quantity sold per product)
Mapper
  Input : one cleaned transaction per line (tab-separated)
          InvoiceNo, StockCode, Description, Quantity, InvoiceDate, UnitPrice, CustomerID, Country
  Output: <Description> TAB <Quantity>
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
        print(f"{description}\t{quantity}")


if __name__ == "__main__":
    main()
