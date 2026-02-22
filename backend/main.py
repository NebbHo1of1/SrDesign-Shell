from datetime import datetime, timedelta

from fastapi import Depends, FastAPI, HTTPException, Query
from sqlalchemy.orm import Session

from backend.db import Base, engine, get_db
from backend.models import Headline
from backend.schemas import HeadlineOut, KPIOut, PriceSeriesOut
from backend.services.news_service import compute_sentiment_vs_price_change, get_headlines
from backend.services.price_service import get_prices_for_range
from backend.services.seed import seed_database

app = FastAPI(title="Senior Design Commodity Insight API", version="0.1.0")

Base.metadata.create_all(bind=engine)


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

    avg_sentiment = round(sum(h.sentiment_score for h in recent) / len(recent), 3) if recent else 0.0
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
def sentiment_price_analytics(commodity: str = Query(default="WTI"), db: Session = Depends(get_db)):
    return compute_sentiment_vs_price_change(db, commodity.upper())
