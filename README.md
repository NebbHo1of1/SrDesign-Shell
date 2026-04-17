# SIGNAL — Shell Intelligence System

News-driven crude oil market intelligence platform with AI-powered predictions.

- **FastAPI backend** — REST API with SQLite, auto-seeding, and ML predictions.
- **Next.js frontend** — real-time dashboard with KPIs, price charts, and news feed.
- **XGBoost model** — trained on sentiment + price features for market direction.

## Prerequisites

- **Python 3.10+** — macOS no longer ships Python by default.  Install via
  Homebrew or from [python.org](https://www.python.org/downloads/):
  ```bash
  brew install python3
  ```
- **Node.js 18+** — required for the frontend.
- **macOS only:** `xgboost` requires OpenMP via Homebrew:
  ```bash
  brew install libomp
  ```

## Quickstart

### 1. Backend (Terminal 1)

Run all four commands from the **project root** (`SrDesign-Shell/`):

```bash
python3 -m venv venv
source venv/bin/activate      # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

> ⚠️ **Do not skip `pip install -r requirements.txt`** — the backend will crash
> on startup with an `ImportError` if dependencies like `fastapi`, `pandas`, or
> `vaderSentiment` are missing.

The backend starts on **http://localhost:8000** and auto-seeds the database on
first run.  If the NEWS_API_KEY or FRED API is unavailable it falls back to
synthetic data automatically.

### 2. Frontend (Terminal 2)

```bash
cd frontend
npm install
npm run dev
```

The frontend starts on **http://localhost:3000**.  Open that URL in your browser
to see the dashboard.

> **Important:** Both the backend (port 8000) and frontend (port 3000) must be
> running at the same time.  The backend allows `localhost` ports 3000–3009 by
> default so the frontend can start on a fallback port if 3000 is busy.  Set
> `CORS_ORIGINS` in `.env` (comma-separated) to override the allowed origins.

### 3. (Optional) Reseed the database

```bash
curl -X POST http://localhost:8000/seed
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `command not found: python` or `pip` | Install Python 3: `brew install python3`, then use `python3`/`pip3` or activate a venv |
| `ModuleNotFoundError` / `ImportError` on backend startup | Run `pip install -r requirements.txt` inside the activated venv |
| Frontend says "Cannot reach API at http://127.0.0.1:8000" | Make sure the backend is running in a separate terminal |
| `xgboost` install fails on macOS | Run `brew install libomp` first |
| Backend crash with `uvicorn --reload` on macOS | Make sure you start from the project root, not inside `backend/` |

## Project structure

```
/backend/            FastAPI API server
/frontend/           Next.js 16 dashboard (React 19)
/dashboard/          Legacy Streamlit UI (deprecated)
/models/             Trained XGBoost model artifacts
/scripts/            Helper scripts
/data/               Raw / processed datasets
```

## API contract

### Health
- `GET /health` -> `{ "status": "ok" }`

### Headlines
- `GET /headlines?commodity=WTI&limit=50&since=...`
- `GET /headlines/{id}`

Headline fields:
`id, published_at, title, source, url, commodity, sentiment_score, event_type, impact_score, pred_label, pred_confidence`

### Prices
- `GET /prices?commodity=WTI&range=7d`

Price series fields:
`commodity, points[{timestamp, close}]`

### KPIs
- `GET /kpis?commodity=WTI`

KPI fields:
`avg_sentiment_24h, high_impact_count_24h, last_prediction, last_confidence, total_headlines_24h`

### Seed
- `POST /seed`

### Extra analytics endpoint used by dashboard
- `GET /analytics/sentiment-price?commodity=WTI`

## Exporting data for Power BI

To load SIGNAL data into Power BI, first export the SQLite tables to CSV:

```bash
source venv/bin/activate   # if not already active
python3 -c "
import sqlite3, csv
conn = sqlite3.connect('backend/data.db')
for table in ['headlines', 'price_points']:
    cur = conn.execute(f'SELECT * FROM {table}')
    cols = [d[0] for d in cur.description]
    with open(f'{table}_export.csv', 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(cols)
        w.writerows(cur.fetchall())
conn.close()
print('Exported headlines_export.csv and price_points_export.csv')
"
```

Then in Power BI → **Get Data** → **Text/CSV** → select **Upload file** →
browse to the exported CSV → **Next** → **Create**.  Repeat for each CSV.
