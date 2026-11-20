# Prompt: Teach me my Big Data project so I can demo it to my teacher

## Your role

You are my tutor. I built a Big Data Analytics (BDA) college project:
**"E-Commerce Sales Data Analysis Using Hadoop MapReduce."** I have to
demonstrate it live to my teacher and answer their questions (a viva). I need
to understand **every part** of it, both the concepts and the commands, well
enough to explain it in my own words.

Teach me with these rules:

1. **Go one lesson at a time** (the lesson plan is at the end). Don't dump
   everything at once. After each lesson, ask me 2–3 short questions to check
   I understood, and wait for my answers before moving on.
2. **Explain simply first, then go deeper.** Use everyday analogies, then the
   real technical terms my teacher will expect (HDFS, NameNode, DataNode,
   YARN, ResourceManager, NodeManager, mapper, combiner, shuffle & sort,
   reducer, Hadoop Streaming, input splits, replication).
3. **For every command, tell me:** what it does, why we need it, what output
   I should expect, and what I should *say* to my teacher while it runs.
4. When I paste terminal output or errors, help me read them.
5. At the end, run a **mock viva**: act as a strict teacher and ask me
   questions one by one, then grade my answers and correct me.

Everything below is the real project. Use these facts and numbers exactly.
Don't make up features the project doesn't have.

---

## 1. Project summary

- **Dataset:** UCI Online Retail dataset. 541,909 transactions from a
  UK-based online gift retailer (many customers are wholesalers),
  1 Dec 2010 – 9 Dec 2011. Columns: InvoiceNo, StockCode, Description,
  Quantity, InvoiceDate, UnitPrice, CustomerID, Country.
- **Goal:** Use Hadoop MapReduce to answer four business questions:
  1. Which products bring in the most revenue?
  2. Which countries bring in the most revenue?
  3. Which products sell the most units?
  4. How does revenue change month by month?
- **Tech:** Hadoop 3.5.0 (single-node / pseudo-distributed: HDFS + YARN) on
  macOS with Java 17. Mappers and reducers are written in **Python** and run
  through **Hadoop Streaming**. pandas does the cleaning and verification,
  Matplotlib draws the graphs, FastAPI is the REST backend, and a Next.js
  website shows the results.

### Pipeline

```
Online Retail .xlsx
   │  scripts/clean_data.py        (pandas)
   ▼
Cleaned TSV file (519,516 rows)
   │  hdfs dfs -put
   ▼
HDFS
   │  Hadoop Streaming: Mapper → Combiner → Shuffle & Sort → Reducer   (4 jobs on YARN)
   ▼
results/output/<job>/part-00000
   │  scripts/verify_results.py    (cross-check every number with pandas)
   │  scripts/visualize.py         (Matplotlib graphs + ranked CSV tables)
   ▼
FastAPI backend (backend/main.py)  →  Next.js website (frontend/)
```

### Folder layout

```
BDA-Project/
├── scripts/
│   ├── download_data.sh      downloads the dataset into data/raw/
│   ├── clean_data.py         Excel → cleaned tab-separated file
│   ├── hadoop_env.sh         sets HADOOP_HOME, JAVA_HOME, PATH, config dir
│   ├── hadoop_start.sh       starts NameNode, DataNode, ResourceManager, NodeManager, JobHistory
│   ├── hadoop_stop.sh        stops them
│   ├── verify_results.py     checks MapReduce output against pandas
│   └── visualize.py          graphs + ranked tables
├── mapreduce/
│   ├── sales_by_product/     mapper.py, reducer.py
│   ├── sales_by_country/     mapper.py, reducer.py
│   ├── top_selling_products/ mapper.py, reducer.py
│   └── monthly_sales/        mapper.py, reducer.py
├── hadoop/conf/              core-site.xml, hdfs-site.xml, mapred-site.xml, yarn-site.xml
├── run_local.sh              runs the jobs WITHOUT Hadoop: mapper | sort | reducer
├── run_hadoop.sh             runs the jobs ON Hadoop via Hadoop Streaming
├── run_pipeline.sh           every stage in one go (local or hadoop mode)
├── tests/test_mapreduce.py   unit tests for the mappers/reducers
├── backend/main.py           FastAPI REST API (+ backend/tests/test_api.py)
├── frontend/                 Next.js website
└── results/                  output/, graphs/, summary/, hadoop_run_log.txt, screenshots
```

---

## 2. Data cleaning (scripts/clean_data.py)

The output is tab-separated with no header. Tabs are used instead of commas
because some product descriptions contain commas.
Columns: `InvoiceNo StockCode Description Quantity InvoiceDate UnitPrice CustomerID Country`

| Step | Rows left |
|------|----------:|
| Raw dataset | 541,909 |
| Drop missing descriptions | 540,455 |
| Drop cancelled invoices (InvoiceNo starts with `C`) **and the original order lines they reverse** | 527,979 |
| Drop Quantity ≤ 0 or UnitPrice ≤ 0 | 526,919 |
| Drop non-product stock codes (POST, DOT, M, BANK CHARGES, AMAZONFEE, ADJUST, CRUK, …) | 524,688 |
| Drop exact duplicates | **519,516** |

**Why it matters to remove reversed orders:** some huge orders were cancelled
minutes later (e.g. 80,995 × "PAPER CRAFT, LITTLE BIRDIE"). If you remove
only the cancellation rows, those orders still show up as top sellers even
though they never actually sold.

---

## 3. The four MapReduce jobs

| # | Job | Mapper emits (key → value) | Reducer outputs |
|---|-----|-----------------------------|-----------------|
| 1 | sales_by_product | Description → Quantity × UnitPrice | total revenue per product |
| 2 | sales_by_country | Country → Quantity × UnitPrice | total revenue per country |
| 3 | top_selling_products | Description → Quantity | total units per product |
| 4 | monthly_sales | YYYY-MM → Quantity × UnitPrice | total revenue per month |

Each reducer just adds up the values for each key. Addition is associative
and commutative, so **the same reducer script is also used as the combiner**.
The combiner pre-adds values on the map side, which cuts down the data sent
across the network during the shuffle.

### Real code: Job 2 mapper (mapreduce/sales_by_country/mapper.py)

```python
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
        print(f"{country}\t{quantity * unit_price:.2f}")
```

### Real code: Job 2 reducer (also the combiner)

```python
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
```

The reducer depends on its input being **sorted by key**, so all lines for
the same key arrive one after another. Hadoop's shuffle & sort guarantees this.

### One record traced through Job 2

```
Input line   : 536370  22728  ALARM CLOCK BAKELIKE PINK  24  2010-12-01 08:45  3.75  12583  France
Mapper       : France    90.00
Shuffle/Sort : France    [90.00, 29.50, ...]   (all values for one key arrive together)
Reducer      : France    182697.39
```

### How run_hadoop.sh runs each job

```bash
hadoop jar $HADOOP_HOME/share/hadoop/tools/lib/hadoop-streaming-*.jar \
  -D mapreduce.job.name="retail-sales_by_country" \
  -D mapreduce.job.reduces=1 \
  -files mapreduce/sales_by_country/mapper.py,mapreduce/sales_by_country/reducer.py \
  -mapper "python3 mapper.py" \
  -combiner "python3 reducer.py" \
  -reducer "python3 reducer.py" \
  -input /user/$USER/retail/input \
  -output /user/$USER/retail/output/sales_by_country
```

Before this runs, the script uploads the cleaned file with
`hdfs dfs -put -f <file> /user/$USER/retail/input/`. Afterwards it copies the
result back with `hdfs dfs -cat .../part-* > results/output/<job>/part-00000`.

`run_local.sh` does the same thing without Hadoop, using Unix pipes:

```bash
cat data/cleaned/online_retail_clean.tsv \
  | python3 mapreduce/sales_by_country/mapper.py \
  | LC_ALL=C sort -t $'\t' -k1,1 \
  | python3 mapreduce/sales_by_country/reducer.py
```

(`sort` plays the role of Hadoop's shuffle & sort. `LC_ALL=C` makes it sort
byte by byte, the same way Hadoop does.)

### Hadoop config (hadoop/conf/)

- core-site.xml: `fs.defaultFS = hdfs://localhost:9000`, `hadoop.tmp.dir = ~/hadoop-data`
- hdfs-site.xml: `dfs.replication = 1` (only one DataNode, so there's one copy of each block)
- mapred-site.xml: `mapreduce.framework.name = yarn`
- yarn-site.xml: `yarn.nodemanager.aux-services = mapreduce_shuffle`, NodeManager memory 4096 MB, minimum container 512 MB

---

## 4. Results of the Hadoop run

All four jobs ran on Hadoop 3.5.0 and finished with state **SUCCEEDED**. Each
used 2 map tasks (2 input splits) and 1 reduce task. The HDFS output matches
the local run byte for byte.

| Job | Wall time | Map task time | Reduce task time | Output |
|-----|---------:|--------------:|-----------------:|-------:|
| sales_by_product | 15 s | 8.9 s | 2.3 s | 140,692 bytes |
| sales_by_country | 19 s | 8.7 s | 2.4 s | 674 bytes |
| top_selling_products | 18 s | 8.9 s | 2.4 s | 127,577 bytes |
| monthly_sales | 19 s | 8.6 s | 2.4 s | 237 bytes |

**What the combiner saves** (from Hadoop counters, 519,516 input records each):

| Job | Map output records | After combiner (shuffled) | Reduce output keys |
|-----|------:|------:|------:|
| sales_by_product | 519,516 | 6,950 | 3,998 |
| sales_by_country | 519,516 | 70 | 38 |
| top_selling_products | 519,516 | 6,950 | 3,998 |
| monthly_sales | 519,516 | 14 | 13 |

### Business results

| Metric | Value |
|---|---:|
| Total revenue (after cleaning) | £9,815,291.49 |
| Units sold | 5,333,762 |
| Distinct products | 3,998 |
| Countries | 38 |
| Top product by revenue | Regency Cakestand 3 Tier (£169,505.64) |
| Top product by units | World War 2 Gliders Asstd Designs (54,711) |
| Top country | United Kingdom, £8,314,970.56 (84.71%) |
| Best month | November 2011 (£1,436,127.66) |

- Top 5 products by revenue: Regency Cakestand 3 Tier £169,505.64 · White Hanging Heart T-Light Holder £100,052.42 · Party Bunting £98,610.18 · Jumbo Bag Red Retrospot £92,595.77 · Rabbit Night Light £66,807.63
- Top 5 countries: United Kingdom 84.71% · Netherlands £283,443.54 · EIRE £262,162.03 · Germany £203,605.08 · France £182,697.39
- Top 5 by units: WW2 Gliders 54,711 · Jumbo Bag Red Retrospot 47,488 · Popcorn Holder 36,546 · Assorted Colour Bird Ornament 36,333 · Pack of 72 Retrospot Cake Cases 36,228
- Monthly trend: roughly flat at £0.5M–£0.77M a month from Dec 2010 to Aug 2011, then rising through autumn to a peak of £1.44M in Nov 2011 (pre-Christmas wholesale buying). Dec 2011 (£442,881.55) is low only because the data ends on 9 December.

---

## 5. Backend API (backend/main.py, FastAPI)

It reads the `part-00000` files and serves them as JSON, re-reading a file
only when it changes on disk. Start it with
`uvicorn backend.main:app --reload --port 8000`. Interactive docs are at
http://127.0.0.1:8000/docs.

| Method | Endpoint | Returns |
|---|---|---|
| GET | /api/health | status, which results exist |
| GET | /api/summary | headline numbers |
| GET | /api/products/revenue?top=10&search= | Job 1 ranked |
| GET | /api/products/quantity?top=10&search= | Job 3 ranked |
| GET | /api/countries?top=50 | Job 2 ranked with % share |
| GET | /api/monthly | Job 4 with month-over-month % change |
| GET | /api/graphs | chart image URLs |
| POST | /api/pipeline/run?mode=local\|hadoop | re-runs the whole pipeline in the background (409 if already running) |
| GET | /api/pipeline/status | idle / running / succeeded / failed + last 50 log lines |

The results endpoints return 503 until the pipeline has produced output.

---

## 6. All the commands (macOS Terminal)

Always start from the project folder:

```bash
cd /Users/adityaarasamangalam/BDA-Project
```

**One-time setup**
```bash
pip3 install -r requirements.txt -r backend/requirements.txt
```

**Clean the data**
```bash
./scripts/download_data.sh          # only if data/raw/ is empty
python3 scripts/clean_data.py
wc -l data/cleaned/online_retail_clean.tsv     # should be 519516
head -3 data/cleaned/online_retail_clean.tsv
```

**Show MapReduce by hand on one job (good for explaining)**
```bash
head -5 data/cleaned/online_retail_clean.tsv | python3 mapreduce/sales_by_country/mapper.py
head -1000 data/cleaned/online_retail_clean.tsv | python3 mapreduce/sales_by_country/mapper.py \
  | LC_ALL=C sort -t $'\t' -k1,1 | python3 mapreduce/sales_by_country/reducer.py
```

**Run all jobs without Hadoop**
```bash
./run_local.sh
```

**Run on Hadoop**
```bash
./scripts/hadoop_start.sh           # start HDFS + YARN + JobHistory
source scripts/hadoop_env.sh        # lets this terminal use hdfs/hadoop commands
jps                                 # should list NameNode, DataNode, ResourceManager, NodeManager, JobHistoryServer
./run_hadoop.sh                     # upload to HDFS + run the 4 jobs on YARN
```

Web UIs (open in Chrome):
- HDFS NameNode: http://localhost:9870 (Utilities → Browse the file system → /user/<me>/retail)
- YARN jobs: http://localhost:8088
- Job history and counters: http://localhost:19888

**Look inside HDFS**
```bash
hdfs dfs -ls /user/$USER/retail/input
hdfs dfs -ls /user/$USER/retail/output
hdfs dfs -ls /user/$USER/retail/output/sales_by_country       # _SUCCESS + part-00000
hdfs dfs -cat /user/$USER/retail/output/sales_by_country/part-00000 | head
hdfs fsck /user/$USER/retail/input -files -blocks             # shows how the file is split into blocks
hdfs dfsadmin -report                                         # cluster capacity and DataNode info
```

**See the results**
```bash
sort -t$'\t' -k2 -nr results/output/sales_by_country/part-00000 | head
sort -t$'\t' -k2 -nr results/output/sales_by_product/part-00000 | head
sort -t$'\t' -k2 -nr results/output/top_selling_products/part-00000 | head
cat results/output/monthly_sales/part-00000
```

**Verify and visualise**
```bash
python3 scripts/verify_results.py   # every MapReduce total must match pandas
python3 scripts/visualize.py        # PNG graphs + ranked CSVs
open results/graphs/
```

**Tests**
```bash
python3 -m unittest discover tests
python3 -m unittest discover -s backend/tests -t .
```

**Backend and website** (each in its own Terminal tab, ⌘T)
```bash
uvicorn backend.main:app --reload --port 8000      # http://127.0.0.1:8000/docs
cd frontend && npm install && npm run dev -- -p 3001    # http://127.0.0.1:3001
```
Use `127.0.0.1` instead of `localhost` in Safari, because Safari forces https on localhost.

**Run every stage in one go**
```bash
./run_pipeline.sh local
./run_pipeline.sh hadoop
```

**Stop Hadoop**
```bash
./scripts/hadoop_stop.sh
```

---

## 7. Demo plan for the teacher (about 10–15 minutes)

1. **Problem & dataset** (1 min): what the dataset is and the 4 questions.
2. **Cleaning** (1–2 min): run `wc -l`, show `head` of the cleaned file, explain the row-count table and why reversed orders are removed.
3. **MapReduce concept by hand** (2 min): pipe 5 lines through the mapper, then 1,000 lines through mapper | sort | reducer. Explain map → shuffle/sort → reduce.
4. **Hadoop cluster** (2 min): `hadoop_start.sh`, `jps`, open the NameNode UI (9870) and the YARN UI (8088).
5. **Run on Hadoop** (3 min): `./run_hadoop.sh`. While it runs, show the job in the YARN UI and explain splits, map tasks, the combiner and the reduce task. Then show the output in HDFS with `hdfs dfs -ls` and `-cat`.
6. **Combiner counters** (1 min): open the job history UI (19888) and point to "Map output records" vs "Combine output records".
7. **Verification** (1 min): `verify_results.py` shows the output matches pandas.
8. **Insights** (2 min): show the graphs, and the website or API docs. State the key findings (UK 84.7%, Regency Cakestand, November peak).
9. **Wrap up:** limitations and improvements.

---

## 8. Lesson plan (teach me in this order)

1. Big Data basics: why Hadoop, the 3 V's, why one machine isn't enough
2. HDFS: blocks, NameNode vs DataNode, replication (and why mine is 1)
3. YARN: ResourceManager, NodeManager, containers, ApplicationMaster
4. MapReduce theory: map, combiner, partitioner, shuffle & sort, reduce, input splits
5. Hadoop Streaming: how Python scripts run inside Hadoop (stdin/stdout, tab-separated key/value)
6. My dataset and cleaning step, line by line
7. My 4 mappers and reducers, line by line; trace a record through each job
8. run_local.sh vs run_hadoop.sh: every line explained
9. The Hadoop config XML files
10. Reading the Hadoop log and counters (results/hadoop_run_log.txt)
11. verify_results.py, visualize.py and the tests
12. The FastAPI backend and the website (brief)
13. A demo rehearsal: walk me through section 7 step by step
14. Troubleshooting: Hadoop won't start, port busy, safe mode, output directory already exists, `python3` not found inside the job
15. Mock viva: at least 20 questions, strict teacher mode

### Questions my teacher is likely to ask (make sure I can answer these)

- What is the difference between a combiner and a reducer? When can you *not* use a combiner?
- Why is the data tab-separated rather than CSV?
- Why are there 2 map tasks? (Hint: input splits / HDFS block size, 128 MB by default.)
- What does shuffle & sort do, and why does the reducer need sorted input?
- What happens if a DataNode fails? Why is replication 1 here?
- What is Hadoop Streaming, and why use it instead of Java?
- Why does `run_hadoop.sh` delete the output directory before each job?
- How do you know the results are correct?
- Why is December 2011 so low?
- How would this scale to a real multi-node cluster? What would you change?
- What are the limitations? (Single node; 44 MB is small for Hadoop; Spark would be faster for repeated analysis.)
- What does each daemon shown by `jps` do?

Start with **Lesson 1** now.
