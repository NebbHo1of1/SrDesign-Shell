from datetime import datetime, timedelta
import random
import uuid

import pandas as pd
from sqlalchemy.orm import Session

from backend.models import Headline, PricePoint

SOURCES = ["Reuters", "Bloomberg", "WSJ", "FT", "CNBC", "MarketWatch"]
EVENT_TYPES = ["Geopolitics", "Supply", "Demand", "Macro"]
VERBS = ["jumps", "slides", "holds", "surges", "slumps", "stabilizes"]
TOPICS = [
    "OPEC guidance",
    "shipping disruptions",
    "US inventory build",
    "refinery maintenance",
    "China demand outlook",
    "Fed rate path",
    "hurricane risk",
    "pipeline outage",
]


def _heuristic_prediction(sentiment: float, impact: float) -> tuple[str, float]:
    raw_signal = sentiment * 0.7 + (impact / 100 - 0.5) * 0.3
    confidence = min(0.95, max(0.5, 0.55 + abs(raw_signal) * 0.8))

    if raw_signal > 0.12:
        label = "UP"
    elif raw_signal < -0.12:
        label = "DOWN"
    else:
        label = "NEUTRAL"

    return label, round(confidence, 3)


def generate_headlines(commodity: str, count: int = 180, seed: int = 42) -> list[Headline]:
    random.seed(seed)
    now = datetime.utcnow()
    headlines: list[Headline] = []

    for i in range(count):
        published_at = now - timedelta(minutes=random.randint(10, 60 * 24 * 10))
        event_type = random.choice(EVENT_TYPES)
        sentiment = round(random.uniform(-0.95, 0.95), 3)
        impact = round(min(99.0, max(8.0, abs(sentiment) * 60 + random.uniform(0, 45))), 2)
        label, conf = _heuristic_prediction(sentiment, impact)
        topic = random.choice(TOPICS)
        verb = random.choice(VERBS)
        source = random.choice(SOURCES)

        title = f"{commodity} {verb} as {topic} drives {event_type.lower()} narrative"

        headlines.append(
            Headline(
                id=str(uuid.uuid4()),
                published_at=published_at,
                title=title,
                source=source,
                url=f"https://example.com/{commodity.lower()}/{i}",
                commodity=commodity,
                sentiment_score=sentiment,
                event_type=event_type,
                impact_score=impact,
                pred_label=label,
                pred_confidence=conf,
            )
        )

    headlines.sort(key=lambda h: h.published_at)
    return headlines


def get_headlines(
    db: Session, commodity: str, limit: int = 50, since: datetime | None = None
):
    parquet_path = "data/processed/news_table.parquet"
    df = pd.read_parquet(parquet_path)

    if "published_at" in df.columns:
        df["published_at"] = pd.to_datetime(df["published_at"], utc=True, errors="coerce")
    elif "date" in df.columns:
        df["published_at"] = pd.to_datetime(df["date"], utc=True, errors="coerce")
    else:
        raise ValueError("Parquet file must contain 'published_at' or 'date' column.")

    df = df.dropna(subset=["published_at", "title"])

    if "commodity" in df.columns:
        df["commodity"] = df["commodity"].astype(str).str.upper()
        if commodity:
            filtered_df = df[df["commodity"] == commodity.upper()]
            if not filtered_df.empty:
                df = filtered_df
    else:
        df["commodity"] = commodity.upper()

    if since is not None:
        since_ts = pd.to_datetime(since, utc=True, errors="coerce")
        df = df[df["published_at"] >= since_ts]

    df = df.sort_values("published_at", ascending=False).head(limit)

    results = []
    for _, row in df.iterrows():
        results.append(
            {
                "id": str(row["url"]) if "url" in df.columns and pd.notna(row["url"]) else str(uuid.uuid4()),
                "published_at": row["published_at"].to_pydatetime(),
                "title": str(row["title"]),
                "source": str(row["source"]) if "source" in df.columns and pd.notna(row["source"]) else "Unknown",
                "url": str(row["url"]) if "url" in df.columns and pd.notna(row["url"]) else "",
                "commodity": str(row["commodity"]).upper() if "commodity" in row else commodity.upper(),
                "sentiment_score": float(row["sentiment_score"]) if "sentiment_score" in df.columns and pd.notna(row["sentiment_score"]) else 0.0,
                "event_type": str(row["event_type"]) if "event_type" in df.columns and pd.notna(row["event_type"]) else "News",
                "impact_score": float(row["impact_score"]) if "impact_score" in df.columns and pd.notna(row["impact_score"]) else 0.0,
                "pred_label": str(row["pred_label"]) if "pred_label" in df.columns and pd.notna(row["pred_label"]) else "NEUTRAL",
                "pred_confidence": float(row["pred_confidence"]) if "pred_confidence" in df.columns and pd.notna(row["pred_confidence"]) else 0.5,
            }
        )

    return results


def compute_sentiment_vs_price_change(db: Session, commodity: str) -> list[dict]:
    headlines = (
        db.query(Headline)
        .filter(Headline.commodity == commodity)
        .order_by(Headline.published_at.desc())
        .limit(120)
        .all()
    )

    output = []
    for h in headlines:
        current_price = (
            db.query(PricePoint)
            .filter(PricePoint.commodity == commodity, PricePoint.timestamp <= h.published_at)
            .order_by(PricePoint.timestamp.desc())
            .first()
        )

        next_price = (
            db.query(PricePoint)
            .filter(PricePoint.commodity == commodity, PricePoint.timestamp > h.published_at)
            .order_by(PricePoint.timestamp.asc())
            .first()
        )

        if current_price and next_price and current_price.close:
            pct = (next_price.close - current_price.close) / current_price.close * 100
            output.append(
                {
                    "headline_id": h.id,
                    "sentiment_score": h.sentiment_score,
                    "next_price_change": round(pct, 4),
                    "pred_label": h.pred_label,
                }
            )

    return output
