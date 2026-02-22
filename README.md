# Senior Design Shell MVP (API v1 + Streamlit UI v1)

This repo contains a shippable MVP for a news-driven commodity insight platform:
- **FastAPI backend** with SQLite and a stable JSON contract.
- **Streamlit dashboard** with 3 pages consuming the backend contract.
- **Offline seed generator** (no NewsAPI dependency yet).

## Project structure

```
/README.md
/requirements.txt
/.env.example
/backend/
  main.py
  db.py
  models.py
  schemas.py
  services/
    news_service.py
    price_service.py
    seed.py
/dashboard/
  app.py
  pages/
    1_Live_Feed.py
    2_Commodity_View.py
    3_Analytics.py
  components/
    sidebar.py
    charts.py
```

## Quickstart

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

In a second terminal:

```bash
source .venv/bin/activate
streamlit run dashboard/app.py
```

## Seed data

Populate local SQLite with realistic fake data:

```bash
curl -X POST http://localhost:8000/seed
```

The seed includes:
- 3 commodities (`WTI`, `BRENT`, `NATGAS`)
- 360 headlines total (120 each)
- 30 days of hourly prices per commodity

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
