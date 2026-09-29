"""
API tests. They use a small fake results/ folder, so they don't need the
dataset or Hadoop.

Run from the project root: python3 -m unittest discover backend/tests
"""
import sys
import tempfile
import time
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from backend.main import create_app

FAKE_OUTPUT = {
    "sales_by_product": "PARTY BUNTING\t300.00\nREGENCY CAKESTAND 3 TIER\t500.00\nRABBIT NIGHT LIGHT\t200.00\n",
    "top_selling_products": "PARTY BUNTING\t60\nREGENCY CAKESTAND 3 TIER\t40\nRABBIT NIGHT LIGHT\t100\n",
    "sales_by_country": "France\t100.00\nGermany\t150.00\nUnited Kingdom\t750.00\n",
    "monthly_sales": "2011-01\t400.00\n2010-12\t200.00\n2011-02\t400.00\n",
}


def make_results_dir(jobs=FAKE_OUTPUT):
    tmp = Path(tempfile.mkdtemp())
    for job, content in jobs.items():
        (tmp / "output" / job).mkdir(parents=True)
        (tmp / "output" / job / "part-00000").write_text(content)
    (tmp / "graphs").mkdir()
    (tmp / "graphs" / "1_sales_by_product.png").write_bytes(b"\x89PNG fake")
    return tmp


class ResultsApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(create_app(make_results_dir()))

    def test_health(self):
        body = self.client.get("/api/health").json()
        self.assertEqual(body["status"], "ok")
        self.assertEqual(len(body["jobs_available"]), 4)

    def test_summary(self):
        body = self.client.get("/api/summary").json()
        self.assertEqual(body["total_revenue"], 1000.0)
        self.assertEqual(body["total_units_sold"], 200)
        self.assertEqual(body["top_product_by_revenue"]["product"], "Regency Cakestand 3 Tier")
        self.assertEqual(body["top_product_by_quantity"]["product"], "Rabbit Night Light")
        self.assertEqual(body["top_country"], {"country": "United Kingdom",
                                               "revenue": 750.0, "share_pct": 75.0})
        self.assertEqual(body["best_month"]["month"], "2011-01")  # ties break alphabetically

    def test_products_by_revenue_ranked_and_limited(self):
        body = self.client.get("/api/products/revenue?top=2").json()
        self.assertEqual([r["product_raw"] for r in body],
                         ["REGENCY CAKESTAND 3 TIER", "PARTY BUNTING"])
        self.assertEqual(body[0], {"rank": 1, "product": "Regency Cakestand 3 Tier",
                                   "product_raw": "REGENCY CAKESTAND 3 TIER",
                                   "revenue": 500.0, "share_pct": 50.0})

    def test_product_search(self):
        body = self.client.get("/api/products/quantity?search=bunting").json()
        self.assertEqual(body, [{"rank": 1, "product": "Party Bunting",
                                 "product_raw": "PARTY BUNTING", "units_sold": 60,
                                 "share_pct": 30.0}])

    def test_countries(self):
        body = self.client.get("/api/countries").json()
        self.assertEqual([r["country"] for r in body], ["United Kingdom", "Germany", "France"])

    def test_monthly_sorted_with_change(self):
        body = self.client.get("/api/monthly").json()
        self.assertEqual(body, [
            {"month": "2010-12", "revenue": 200.0, "change_pct": None},
            {"month": "2011-01", "revenue": 400.0, "change_pct": 100.0},
            {"month": "2011-02", "revenue": 400.0, "change_pct": 0.0},
        ])

    def test_graphs_listed_and_served(self):
        body = self.client.get("/api/graphs").json()
        self.assertEqual(body, [{"name": "1_sales_by_product",
                                 "url": "/graphs/1_sales_by_product.png"}])
        self.assertEqual(self.client.get(body[0]["url"]).status_code, 200)

    def test_invalid_top_rejected(self):
        self.assertEqual(self.client.get("/api/products/revenue?top=0").status_code, 422)

    def test_cors_header(self):
        resp = self.client.get("/api/health", headers={"Origin": "http://localhost:3000"})
        self.assertEqual(resp.headers.get("access-control-allow-origin"), "*")


class MissingResultsTest(unittest.TestCase):
    def test_returns_503_before_pipeline_has_run(self):
        client = TestClient(create_app(make_results_dir(jobs={})))
        resp = client.get("/api/summary")
        self.assertEqual(resp.status_code, 503)
        self.assertIn("Run the pipeline", resp.json()["detail"])


class PipelineApiTest(unittest.TestCase):
    def wait_until_done(self, client):
        for _ in range(100):
            state = client.get("/api/pipeline/status").json()
            if state["status"] != "running":
                return state
            time.sleep(0.05)
        self.fail("pipeline did not finish")

    def test_run_success(self):
        cmd = lambda mode: [sys.executable, "-c", f"print('running {mode}')"]
        client = TestClient(create_app(make_results_dir(), pipeline_command=cmd))
        self.assertEqual(client.get("/api/pipeline/status").json()["status"], "idle")

        resp = client.post("/api/pipeline/run?mode=local")
        self.assertEqual(resp.status_code, 202)
        state = self.wait_until_done(client)
        self.assertEqual(state["status"], "succeeded")
        self.assertEqual(state["log_tail"], ["running local"])

    def test_run_failure_reported(self):
        cmd = lambda mode: [sys.executable, "-c", "import sys; sys.exit(3)"]
        client = TestClient(create_app(make_results_dir(), pipeline_command=cmd))
        client.post("/api/pipeline/run")
        state = self.wait_until_done(client)
        self.assertEqual((state["status"], state["return_code"]), ("failed", 3))

    def test_concurrent_run_rejected(self):
        cmd = lambda mode: [sys.executable, "-c", "import time; time.sleep(1)"]
        client = TestClient(create_app(make_results_dir(), pipeline_command=cmd))
        self.assertEqual(client.post("/api/pipeline/run").status_code, 202)
        self.assertEqual(client.post("/api/pipeline/run").status_code, 409)
        self.wait_until_done(client)

    def test_invalid_mode_rejected(self):
        client = TestClient(create_app(make_results_dir()))
        self.assertEqual(client.post("/api/pipeline/run?mode=spark").status_code, 422)


if __name__ == "__main__":
    unittest.main()
