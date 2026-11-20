"""
Built-in HiveQL queries over the cleaned Online Retail data.

Each query is written in HiveQL against a `sales` table with the same columns
as the cleaned TSV that run_hadoop.sh uploads to HDFS (see HIVE_DDL). The
queries only use syntax that HiveQL and SQLite share (GROUP BY, window
functions, LAG, SUBSTR, CAST, ROUND, COUNT DISTINCT), so the exact text shown
on the website is what gets executed. It runs on an SQLite copy of the cleaned
data, built once from the TSV and rebuilt whenever the TSV changes.
"""
import csv
import sqlite3
import threading
import time
from pathlib import Path

ENGINE_NAME = "SQLite (HiveQL-compatible)"

HIVE_DDL = """CREATE EXTERNAL TABLE IF NOT EXISTS sales (
  invoice_no   STRING,
  stock_code   STRING,
  description  STRING,
  quantity     INT,
  invoice_date STRING,
  unit_price   DOUBLE,
  customer_id  STRING,
  country      STRING
)
ROW FORMAT DELIMITED FIELDS TERMINATED BY '\\t'
STORED AS TEXTFILE
LOCATION '/user/${USER}/retail/input';"""

QUERIES = [
    {
        "id": "overview",
        "title": "Dataset overview",
        "description": "Row, order, customer, product and country counts plus total revenue.",
        "sql": """SELECT COUNT(*)                                AS transactions,
       COUNT(DISTINCT invoice_no)              AS orders,
       COUNT(DISTINCT CASE WHEN customer_id <> 'UNKNOWN'
                           THEN customer_id END) AS customers,
       COUNT(DISTINCT description)             AS products,
       COUNT(DISTINCT country)                 AS countries,
       SUM(quantity)                           AS units_sold,
       ROUND(SUM(quantity * unit_price), 2)    AS total_revenue
FROM sales;""",
    },
    {
        "id": "top_products_revenue",
        "title": "Top 10 products by revenue",
        "description": "Same question as MapReduce Job 1 (Sales by Product).",
        "sql": """SELECT description,
       ROUND(SUM(quantity * unit_price), 2) AS revenue
FROM sales
GROUP BY description
ORDER BY revenue DESC
LIMIT 10;""",
    },
    {
        "id": "revenue_by_country",
        "title": "Revenue by country",
        "description": "MapReduce Job 2 in one query, with each country's share of revenue.",
        "sql": """SELECT country,
       ROUND(SUM(quantity * unit_price), 2) AS revenue,
       ROUND(100 * SUM(quantity * unit_price)
                 / SUM(SUM(quantity * unit_price)) OVER (), 2) AS share_pct
FROM sales
GROUP BY country
ORDER BY revenue DESC
LIMIT 10;""",
    },
    {
        "id": "top_products_units",
        "title": "Top 10 products by units sold",
        "description": "Same question as MapReduce Job 3 (Top-Selling Products).",
        "sql": """SELECT description,
       SUM(quantity) AS units_sold
FROM sales
GROUP BY description
ORDER BY units_sold DESC
LIMIT 10;""",
    },
    {
        "id": "monthly_revenue",
        "title": "Monthly revenue and growth",
        "description": "MapReduce Job 4 plus month-over-month change using LAG().",
        "sql": """SELECT month,
       revenue,
       ROUND(100 * (revenue - LAG(revenue) OVER (ORDER BY month))
                 / LAG(revenue) OVER (ORDER BY month), 2) AS change_pct
FROM (
  SELECT SUBSTR(invoice_date, 1, 7)           AS month,
         ROUND(SUM(quantity * unit_price), 2) AS revenue
  FROM sales
  GROUP BY SUBSTR(invoice_date, 1, 7)
) m
ORDER BY month;""",
    },
    {
        "id": "top_customers",
        "title": "Top 10 customers by spend",
        "description": "Biggest customers, their order count and the country they buy from.",
        "sql": """SELECT customer_id,
       country,
       COUNT(DISTINCT invoice_no)           AS orders,
       ROUND(SUM(quantity * unit_price), 2) AS total_spent
FROM sales
WHERE customer_id <> 'UNKNOWN'
GROUP BY customer_id, country
ORDER BY total_spent DESC
LIMIT 10;""",
    },
    {
        "id": "avg_order_value",
        "title": "Average order value by country",
        "description": "Revenue per order, for countries with at least 20 orders.",
        "sql": """SELECT country,
       COUNT(DISTINCT invoice_no) AS orders,
       ROUND(SUM(quantity * unit_price) / COUNT(DISTINCT invoice_no), 2) AS avg_order_value
FROM sales
GROUP BY country
HAVING COUNT(DISTINCT invoice_no) >= 20
ORDER BY avg_order_value DESC
LIMIT 10;""",
    },
    {
        "id": "hourly_sales",
        "title": "Sales by hour of day",
        "description": "When during the day customers place their orders.",
        "sql": """SELECT CAST(SUBSTR(invoice_date, 12, 2) AS INT) AS hour,
       COUNT(DISTINCT invoice_no)               AS orders,
       ROUND(SUM(quantity * unit_price), 2)     AS revenue
FROM sales
GROUP BY CAST(SUBSTR(invoice_date, 12, 2) AS INT)
ORDER BY hour;""",
    },
]

QUERIES_BY_ID = {q["id"]: q for q in QUERIES}

_COLUMNS = ["invoice_no", "stock_code", "description", "quantity",
            "invoice_date", "unit_price", "customer_id", "country"]


class HiveEngine:
    """Runs the built-in queries on an SQLite copy of the cleaned TSV."""

    def __init__(self, tsv_path: Path, db_path: Path):
        self.tsv_path = Path(tsv_path)
        self.db_path = Path(db_path)
        self._lock = threading.Lock()

    def _ensure_db(self):
        if not self.tsv_path.exists():
            raise FileNotFoundError(
                f"{self.tsv_path} not found. Run python3 scripts/clean_data.py first.")
        with self._lock:
            if (self.db_path.exists()
                    and self.db_path.stat().st_mtime >= self.tsv_path.stat().st_mtime):
                return
            tmp = self.db_path.with_suffix(".tmp")
            tmp.unlink(missing_ok=True)
            con = sqlite3.connect(tmp)
            try:
                con.execute(
                    "CREATE TABLE sales (invoice_no TEXT, stock_code TEXT, description TEXT, "
                    "quantity INTEGER, invoice_date TEXT, unit_price REAL, "
                    "customer_id TEXT, country TEXT)")
                with open(self.tsv_path, encoding="utf-8", newline="") as f:
                    rows = (r for r in csv.reader(f, delimiter="\t", quoting=csv.QUOTE_NONE)
                            if len(r) == len(_COLUMNS))
                    con.executemany("INSERT INTO sales VALUES (?,?,?,?,?,?,?,?)",
                                    ((r[0], r[1], r[2], int(r[3]), r[4], float(r[5]), r[6], r[7])
                                     for r in rows))
                con.commit()
            finally:
                con.close()
            tmp.replace(self.db_path)

    def run(self, query_id: str):
        query = QUERIES_BY_ID[query_id]
        self._ensure_db()
        start = time.perf_counter()
        con = sqlite3.connect(f"file:{self.db_path}?mode=ro", uri=True)
        try:
            cur = con.execute(query["sql"].rstrip().rstrip(";"))
            columns = [d[0] for d in cur.description]
            rows = [list(r) for r in cur.fetchall()]
        finally:
            con.close()
        return {
            "id": query_id,
            "columns": columns,
            "rows": rows,
            "row_count": len(rows),
            "elapsed_ms": round((time.perf_counter() - start) * 1000, 1),
            "engine": ENGINE_NAME,
        }
