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
| – | Hero: a glass crystal surrounded by orbiting "records" that pull in as you scroll (magnetic buttons, scrambled captions) | `/api/summary` |
| – | Record stream: a 3D corridor of cards, each one line of reducer output (product, country, units, month) | all result endpoints |
| 01 | Overview: animated KPI cards and headline facts | `/api/summary`, `/api/monthly` |
| 02 | Pipeline: a 3D MapReduce machine (HDFS → Map → Shuffle → Reduce → Output) with modes, station focus and a traced record; clicking a station lights up its stage in the Raw → Clean → HDFS → Map → Combine/shuffle → Reduce flow with the real Hadoop counters | Hadoop run log |
| 03 | Monthly sales: an area chart and a scroll-driven timeline of notable months | `/api/monthly` |
| 04 | Products: a liquid-glass WebGL carousel of the top 8, then the ranked list, searching all 3,998 products | `/api/products/*` |
| 05 | Countries: a draggable dot globe with arcs from the UK to every market, a donut of revenue share and the top markets outside the UK | `/api/countries` |
| 06 | Run it: start the pipeline (local or Hadoop) and watch its log over a particle field that speeds up while a job runs | `/api/pipeline/*` |
| 07 | Matplotlib output: the PNG charts from `scripts/visualize.py` in a noise-dissolve WebGL gallery (bundled copies when offline) | `/api/graphs` |

## Stack

Next.js 16 · React 19 · Tailwind CSS 4 · Recharts · Motion · GSAP ·
three.js (React Three Fiber + drei)

## Layout

```
app/                 layout, global styles, page
components/sections/ one file per page section
components/ui/       reusable pieces (charts, hero, 3D machine, carousel, globe, gallery)
lib/data-cards.ts    draws result cards to images for the stream and carousel
lib/geo.ts           country coordinates for the globe
lib/api.ts           API client, types and number formatting
lib/use-dataset.ts   loads the data, falls back to the snapshot
```

## Credits

Components adapted from
[frontend-bitch](https://github.com/Adityacrypto-del/frontend-bitch), all seven of them:

| Project | Used as |
|---------|---------|
| 01-prism-hero | the hero |
| 02-gateway-flow | `components/ui/gateway-flow.tsx`, ported from its iframe to a canvas, behind the Run section |
| 03-liquid-glass-carousel | `components/ui/liquid-glass-carousel.tsx`, the top-products carousel (vertical wheel scrolls the page) |
| 04-agentic-factory-3d | `components/ui/agentic-factory-3d.tsx`, relabelled as a MapReduce job for the Pipeline section |
| 05-image-stream-hero | `components/ui/image-stream-hero.tsx`, the record stream; cards are drawn from the data by `lib/data-cards.ts` |
| 06-scroll-timeline | the monthly timeline |
| 07-morph-gallery | `components/ui/morph-gallery.tsx`, the Matplotlib gallery |

From [21st.dev](https://21st.dev):

- `components/ui/revenue-charts-kpi.tsx` is the "revenue-charts-kpi" component,
  with animation turned on and typing updated for Recharts 3.
- The aurora background, count-up, spotlight card and animated tabs follow
  patterns from 21st.dev components.
- The dot globe (`dot-globe.tsx`), scramble text and magnetic button were built
  here after the 21st.dev "Interactive Globe", "Text Scramble" and "Magnetic
  Button" components, so they could take the project's data and colours.
