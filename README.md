# SIGNAL — Shell Intelligence System

News-driven crude oil market intelligence platform with AI-powered predictions.

- **FastAPI backend** — REST API with SQLite, auto-seeding, and ML predictions.
- **Next.js frontend** — real-time dashboard with KPIs, price charts, and news feed.
- **XGBoost model** — trained on sentiment + price features for market direction.

## Quickstart

> **macOS only:** `xgboost` requires OpenMP via Homebrew before installing Python dependencies:
> ```bash
> brew install libomp
> ```

### 1. Backend (Terminal 1)

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

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
