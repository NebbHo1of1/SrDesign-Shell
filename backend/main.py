from dotenv import load_dotenv
load_dotenv()

import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.db import Base, SessionLocal, engine, get_db
from backend.models import Headline
from backend.schemas import HeadlineOut, KPIOut, PriceSeriesOut
from backend.services.news_service import compute_sentiment_vs_price_change, get_headlines
from backend.services.prediction_service import get_model_report, predict_market_direction
from backend.services.price_service import get_prices_for_range
from backend.services.seed import seed_database

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Auto-seed the database on startup when it is empty."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        headline_count = db.query(Headline).count()
        if headline_count == 0:
            logger.info("Database is empty — auto-seeding with initial data…")
            result = seed_database(db)
            logger.info("Auto-seed complete: %s", result)
    except Exception:
        logger.exception("Auto-seed failed")
    finally:
        db.close()
    yield


app = FastAPI(title="SIGNAL — Shell Intelligence API", version="2.0.0", lifespan=lifespan)

# Allow the Next.js frontend to reach the API.
# In development the Next.js dev-server may start on a different port
# (e.g. 3001) if 3000 is already in use, so we allow a small range by default.
# Set CORS_ORIGINS env-var (comma-separated) to override.
_DEV_PORT_START = 3000
_DEV_PORT_END = 3010  # exclusive upper bound
_default_origins = [
    f"http://localhost:{p}" for p in range(_DEV_PORT_START, _DEV_PORT_END)
] + [
    f"http://127.0.0.1:{p}" for p in range(_DEV_PORT_START, _DEV_PORT_END)
]
_cors_origins = os.getenv("CORS_ORIGINS")
ALLOWED_ORIGINS: list[str] = (
    [o.strip() for o in _cors_origins.split(",") if o.strip()]
    if _cors_origins
    else _default_origins
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/seed")
def seed(db: Session = Depends(get_db)):
    return seed_database(db)


@app.get("/headlines", response_model=list[HeadlineOut])
def list_headlines(
    commodity: str = Query(default="WTI"),
    limit: int = Query(default=50, ge=1, le=300),
    since: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return get_headlines(db, commodity=commodity.upper(), limit=limit, since=since)


@app.get("/headlines/{headline_id}", response_model=HeadlineOut)
def get_headline(headline_id: str, db: Session = Depends(get_db)):
    headline = db.query(Headline).filter(Headline.id == headline_id).first()
    if not headline:
        raise HTTPException(status_code=404, detail="Headline not found")
    return headline


@app.get("/prices", response_model=PriceSeriesOut)
def get_prices(
    commodity: str = Query(default="WTI"),
    range: str = Query(default="7d", pattern="^(7d|14d|30d)$"),
    db: Session = Depends(get_db),
):
    points = get_prices_for_range(db, commodity.upper(), range)
    return {"commodity": commodity.upper(), "points": points}


@app.get("/kpis", response_model=KPIOut)
def get_kpis(commodity: str = Query(default="WTI"), db: Session = Depends(get_db)):
    commodity = commodity.upper()
    since = datetime.utcnow() - timedelta(hours=24)

    recent = (
        db.query(Headline)
        .filter(Headline.commodity == commodity, Headline.published_at >= since)
        .order_by(Headline.published_at.desc())
        .all()
    )

    # If no headlines in the last 24h, fall back to the most recent headlines
    # so the dashboard KPI cards always show meaningful data.
    if not recent:
        recent = (
            db.query(Headline)
            .filter(Headline.commodity == commodity)
            .order_by(Headline.published_at.desc())
            .limit(50)
            .all()
        )

    avg_sentiment = round(sum(h.sentiment_score for h in recent) / len(recent), 3) if recent else 0
    high_impact = len([h for h in recent if h.impact_score >= 70])
    latest = recent[0] if recent else None

    return {
        "avg_sentiment_24h": avg_sentiment,
        "high_impact_count_24h": high_impact,
        "last_prediction": latest.pred_label if latest else None,
        "last_confidence": latest.pred_confidence if latest else None,
        "total_headlines_24h": len(recent),
    }


@app.get("/analytics/sentiment-price")
def sentiment_price_analytics(
    commodity: str = Query(default="WTI"),
    db: Session = Depends(get_db),
):
    return compute_sentiment_vs_price_change(db, commodity.upper())


@app.get("/predict")
def predict(
    commodity: str = Query(default="WTI"),
    db: Session = Depends(get_db),
):
    """Run the trained AI model (from train_model.py) on live DB data
    and return the market-direction prediction with confidence."""
    try:
        return predict_market_direction(db, commodity=commodity.upper())
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.get("/model-report")
def model_report():
    """Return the training metrics and feature importances of the
    trained model (generated by train_model.py)."""
    try:
        return get_model_report()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
