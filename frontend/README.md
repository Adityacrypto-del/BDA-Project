# Frontend

A single-page Next.js site that shows the MapReduce results from the
[backend API](../backend/main.py). It scrolls through the pipeline and the four
jobs, with animated charts, counters and a 3D hero.

## Run

Start the backend first, from the project root:

```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --port 8000
```

Then, in another terminal:

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

The site calls `http://localhost:8000` by default. To use another port, set
`NEXT_PUBLIC_API_URL`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8001 npm run dev
```

Next.js builds this value into the page, so for a production build set it
before `npm run build`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run build
npm start            # http://localhost:3000
```

If the API can't be reached, the page falls back to a copy of the results saved
in [lib/snapshot.json](lib/snapshot.json) and the top bar shows
**Offline snapshot**. When it is connected, the bar shows **Live API**.

## Sections

| # | Section | Data |
|---|---------|------|
| – | Hero: a glass crystal surrounded by orbiting "records" that pull in as you scroll | `/api/summary` |
| 01 | Overview: animated KPI cards and headline facts | `/api/summary`, `/api/monthly` |
| 02 | Pipeline: Raw → Clean → HDFS → Map → Combine/shuffle → Reduce, with the real Hadoop counters for each job | Hadoop run log |
| 03 | Monthly sales: an area chart and a scroll-driven timeline of notable months | `/api/monthly` |
| 04 | Products: ranked by revenue or by units, searching all 3,998 products | `/api/products/*` |
| 05 | Countries: a donut of revenue share and the top markets outside the UK | `/api/countries` |
| 06 | Run it: start the pipeline (local or Hadoop) and watch its log | `/api/pipeline/*` |
| 07 | Matplotlib output: the PNG charts from `scripts/visualize.py` | `/api/graphs` |

## Stack

Next.js 16 · React 19 · Tailwind CSS 4 · Recharts · Motion · GSAP ·
three.js (React Three Fiber + drei)

## Layout

```
app/                 layout, global styles, page
components/sections/ one file per page section
components/ui/       reusable pieces (charts, hero, timeline, tabs, cards)
lib/api.ts           API client, types and number formatting
lib/use-dataset.ts   loads the data, falls back to the snapshot
```

## Credits

- The prism hero, scroll timeline and project config are adapted from
  [frontend-bitch](https://github.com/Adityacrypto-del/frontend-bitch).
- `components/ui/revenue-charts-kpi.tsx` is the "revenue-charts-kpi" component
  from [21st.dev](https://21st.dev), with animation turned on and typing updated
  for Recharts 3. The aurora background, count-up, spotlight card and animated
  tabs follow patterns from 21st.dev components.
