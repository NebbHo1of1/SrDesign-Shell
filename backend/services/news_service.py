from datetime import datetime, timedelta
import random
import uuid

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
) -> list[Headline]:
    query = db.query(Headline).filter(Headline.commodity == commodity)
    if since:
        query = query.filter(Headline.published_at >= since)
    return query.order_by(Headline.published_at.desc()).limit(limit).all()


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
