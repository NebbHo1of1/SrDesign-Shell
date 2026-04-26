# S.I.G.N.A.L. — Shell Intelligence System

> **AI-powered crude oil market intelligence platform built for energy analysts.**

SIGNAL (**S**hell **I**ntelligence **G**enerating **N**ews **A**nalysis & **L**earning) is a full-stack decision-support platform that transforms raw oil-market news into actionable intelligence. It combines live sentiment analysis, machine-learning price forecasting, and an analyst-grade dashboard to give energy teams an edge on every trading session.

---

## What Is SIGNAL?

SIGNAL ingests crude oil news headlines in real time, scores them with NLP sentiment analysis, and feeds that signal — combined with historical price data — into two distinct AI models:

1. **Direction Model** — An ensemble classifier that predicts whether WTI crude oil will move **UP** or **DOWN** on the next session, with 81.5% directional accuracy.
2. **Price Forecast Model** — A stacking ensemble (Ridge + HistGBM + LightGBM → RidgeCV meta-learner) that predicts the next closing price in $/bbl, beating a naïve random-walk baseline (RMSE 2.07 vs 2.09, R² 0.953).

Everything is surfaced through a role-gated, theme-aware dashboard so analysts, executives, and viewers each see exactly what they need.

---

## How SIGNAL Helps Analysts

| Analyst Pain Point | How SIGNAL Solves It |
|----|-----|
| **Information overload** — hundreds of headlines per day | Intelligence Feed consolidates all headlines with auto-tagged event type, impact score, and sentiment in a single scannable view |
| **Gut-feel direction calls** | Direction Model gives a data-backed UP/DOWN prediction with confidence score and full prediction history chart |
| **No quantitative price anchor** | Price Forecast dashboard shows predicted next-session close vs. the naïve baseline, with error analysis (within-2%, largest miss, direction accuracy) |
| **Black-box models** | Feature Importance bar chart, collapsible glossary, and 3-step model architecture explainer make every prediction transparent |
| **Alert fatigue** | Configurable price-move and sentiment-spike thresholds trigger targeted alerts in the Notification Center — analysts only get pinged on signals that matter |
| **Context switching** | Global Command Palette (⌘K / Ctrl+K) searches headlines, navigates pages, and runs actions without leaving the keyboard |
| **Senior vs. junior access** | Role-based access control keeps executives on strategic pages and restricts the Signal Engine to executive-only use |

---

## Dashboard Pages

| Page | Role Access | Purpose |
|------|-------------|---------|
| **Command Center** | All roles | Live KPI cards (sentiment, confidence, headlines, alerts), Actual-vs-Predicted holdout chart, rolling price chart, news panel, alert log |
| **Intelligence Feed** | All roles | Full paginated news feed with sentiment badges, impact scores, event tags, and filterable commodity selector |
| **Commodity View** | All roles | Detailed WTI/Brent price chart with volume overlay and date-range selector |
| **Data Analytics** | Analyst + Executive | Sentiment vs. price correlation charts, tone trend analysis, article-count heatmaps |
| **Direction Model** | Analyst + Executive | UP/DOWN classifier metrics (Accuracy/Precision/Recall/F1), daily prediction history chart, feature importance, model pipeline explainer |
| **Price Forecast** | Analyst + Executive | RMSE/MAE/R²/MAPE metrics with baseline callouts, 3-line Actual vs Predicted vs Baseline chart, error-analysis row, feature importance, model comparison table |
| **Signal Engine** | Executive only | High-level strategic signal aggregation and escalation protocols |
| **Settings** | All roles | User profile, alert threshold editor (price move %, sentiment spike), theme selector, session info |

---

## AI Models At a Glance

### Direction Model (UP/DOWN Classifier)
- **Algorithm:** XGBoost ensemble
- **Accuracy:** 81.5 % | Precision: 83 % | Recall: 80 % | F1: 81 %
- **Features:** price lags (1–10 days), return horizons, moving averages, volatility windows, rolling news sentiment, article-count MAs, day-of-week encoding
- **Output:** Directional label + confidence score, logged per prediction to SQLite

### Price Forecast Model (Next-Close Regression)
- **Algorithm:** Stacking ensemble — Ridge + HistGBM + LightGBM base learners → RidgeCV meta-learner
- **RMSE:** 2.072 (baseline: 2.086) | **R²:** 0.953 | **MAPE:** displayed live
- **Target modes:** `next_price` (default), `price_change`, `next_day_return`, `future_price_3`
- **Holdout chart:** 20 % out-of-sample predictions stored in `models/holdout_predictions.json` and streamed to the frontend via `/holdout-predictions`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 + React 19, Tailwind CSS, Framer Motion, Recharts |
| **Backend** | FastAPI (Python 3.10+), SQLAlchemy, SQLite |
| **ML / Data** | scikit-learn, XGBoost, LightGBM, pandas, VADER Sentiment |
| **Auth / RBAC** | localStorage JWT-style session, 3-role system (Executive / Analyst / Viewer) |
| **Theming** | 3-theme system — dark (default), black, light — persisted to `localStorage` |

---

## Roles

| Role | Access |
|------|--------|
| **Executive** | Full platform access including Signal Engine; cinematic 6-step onboarding with escalation protocols |
| **Analyst** | All pages except Signal Engine; standard 5-step onboarding |
| **Viewer** | Command Center, Intelligence Feed, Commodity View, Settings only |

---

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

> ⚠️ **You must create and activate the virtual environment first** (steps 1–2
> above).  macOS does not ship `python` or `pip` — only `python3` / `pip3`.
> Inside an activated venv the short names (`python`, `pip`) work automatically.
> If you see `command not found: pip` or `command not found: python`, run
> `source venv/bin/activate` (or create the venv if you haven't yet).

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
| `command not found: python` or `pip` | You haven't activated the virtual environment. Run `source venv/bin/activate` first (create it with `python3 -m venv venv` if needed). Inside the venv, `python` and `pip` work. Outside, use `python3` / `pip3`. |
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

To load SIGNAL data into Power BI, first export the SQLite tables to CSV.
Run from the **project root** (`SrDesign-Shell/`) — the CSV files will be
created **in that same directory** (next to `requirements.txt`).

```bash
source venv/bin/activate   # if not already active
python3 scripts/export_csv.py
```

Or inline:

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

After running, you should see `headlines_export.csv` and
`price_points_export.csv` in the project root.  On macOS you can verify with:

```bash
ls -la *_export.csv
```

Then in Power BI → **Get Data** → **Text/CSV** → select **Upload file** →
browse to the exported CSV → **Next** → **Create**.  Repeat for each CSV.
