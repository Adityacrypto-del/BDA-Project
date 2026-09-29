"""
Unit tests for the MapReduce jobs. Each test pipes a small, hand-checked
input through mapper -> sort -> reducer, exactly like Hadoop Streaming does.

Run: python3 -m unittest discover tests
"""
import os
import subprocess
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SAMPLE = "\n".join([
    "536365\t85123A\tWHITE HANGING HEART T-LIGHT HOLDER\t6\t2010-12-01 08:26\t2.55\t17850\tUnited Kingdom",
    "536366\t22633\tHAND WARMER UNION JACK\t6\t2010-12-01 08:28\t1.85\t17850\tUnited Kingdom",
    "536370\t22728\tALARM CLOCK BAKELIKE PINK\t24\t2010-12-01 08:45\t3.75\t12583\tFrance",
    "540001\t85123A\tWHITE HANGING HEART T-LIGHT HOLDER\t10\t2011-01-04 10:00\t2.95\t13047\tFrance",
    "this line is malformed",
    "540002\t22633\tHAND WARMER UNION JACK\tnot-a-number\t2011-01-04 10:00\t1.85\t13047\tFrance",
]) + "\n"


def run_job(job, data=SAMPLE):
    job_dir = os.path.join(ROOT, "mapreduce", job)
    mapped = subprocess.run([sys.executable, os.path.join(job_dir, "mapper.py")],
                            input=data, capture_output=True, text=True, check=True).stdout
    shuffled = "".join(sorted(mapped.splitlines(keepends=True)))
    reduced = subprocess.run([sys.executable, os.path.join(job_dir, "reducer.py")],
                             input=shuffled, capture_output=True, text=True, check=True).stdout
    return dict(line.rsplit("\t", 1) for line in reduced.splitlines())


class MapReduceJobsTest(unittest.TestCase):
    def test_sales_by_product(self):
        self.assertEqual(run_job("sales_by_product"), {
            "ALARM CLOCK BAKELIKE PINK": "90.00",
            "HAND WARMER UNION JACK": "11.10",
            "WHITE HANGING HEART T-LIGHT HOLDER": "44.80",  # 15.30 + 29.50
        })

    def test_sales_by_country(self):
        self.assertEqual(run_job("sales_by_country"), {
            "France": "119.50",          # 90.00 + 29.50
            "United Kingdom": "26.40",   # 15.30 + 11.10
        })

    def test_top_selling_products(self):
        self.assertEqual(run_job("top_selling_products"), {
            "ALARM CLOCK BAKELIKE PINK": "24",
            "HAND WARMER UNION JACK": "6",
            "WHITE HANGING HEART T-LIGHT HOLDER": "16",
        })

    def test_monthly_sales(self):
        self.assertEqual(run_job("monthly_sales"), {
            "2010-12": "116.40",
            "2011-01": "29.50",
        })

    def test_reducer_works_as_combiner(self):
        # Pre-aggregated combiner output must reduce to the same totals
        partial = "France\t50.00\nFrance\t69.50\nUnited Kingdom\t26.40\n"
        reducer = os.path.join(ROOT, "mapreduce", "sales_by_country", "reducer.py")
        out = subprocess.run([sys.executable, reducer], input=partial,
                             capture_output=True, text=True, check=True).stdout
        self.assertEqual(out, "France\t119.50\nUnited Kingdom\t26.40\n")

    def test_empty_input(self):
        for job in ("sales_by_product", "sales_by_country",
                    "top_selling_products", "monthly_sales"):
            self.assertEqual(run_job(job, ""), {})


if __name__ == "__main__":
    unittest.main()
