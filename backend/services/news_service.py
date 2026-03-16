from datetime import datetime, timedelta
import random
import uuid
import re

import pandas as pd
from sqlalchemy.orm import Session
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

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

EVENT_KEYWORDS = {
    "Geopolitics": [
        "war", "sanction", "conflict", "iran", "russia", "ukraine",
        "middle east", "attack", "military", "tariff", "ceasefire"
    ],
    "Supply": [
        "opec", "production cut", "output cut", "refinery outage",
        "pipeline outage", "shutdown", "disruption", "inventory draw",
        "export drop", "maintenance", "supply cut", "inventory build",
        "refinery", "pipeline", "output", "production"
    ],
    "Demand": [
        "demand", "consumption", "import growth", "economic growth",
        "travel demand", "jet fuel demand", "gasoline demand",
        "industrial activity", "china demand", "outlook"
    ],
    "Macro": [
        "inflation", "interest rate", "fed", "recession", "gdp",
        "cpi", "unemployment", "dollar", "economic slowdown", "rate path"
    ],
    "Weather": [
        "hurricane", "storm", "heatwave", "cold snap", "freeze",
        "flood", "wildfire", "weather", "hurricane risk"
    ],
    "Regulatory": [
        "regulation", "policy", "ban", "restriction", "approval",
        "compliance", "law", "government rule", "epa"
    ],
}

analyzer = SentimentIntensityAnalyzer()


def preprocess_text(text: str) -> str:
    text = str(text).lower()
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\bbrent crude\b", " brent ", text)
    text = re.sub(r"\bhenry hub\b", " henry_hub ", text)
    text = re.sub(r"\bwti crude\b", " wti ", text)
    text = re.sub(r"[^a-z0-9\s$.\-]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def classify_event_type(text: str) -> str:
    text_lower = text.lower()

    best_type = "Other"
    best_count = 0

    for event_type, keywords in EVENT_KEYWORDS.items():
        match_count = 0

        for keyword in keywords:
            if keyword in text_lower:
                match_count += 1

        if match_count > best_count:
            best_count = match_count
            best_type = event_type

    return best_type


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
        title = str(row["title"])
        clean_title = preprocess_text(title)
        sentiment = analyzer.polarity_scores(clean_title)["compound"]

        if sentiment > 0.15:
            pred_label = "UP"
        elif sentiment < -0.15:
            pred_label = "DOWN"
        else:
            pred_label = "NEUTRAL"

        pred_confidence = max(0.5, round(abs(sentiment), 3))
        impact_score = round(abs(sentiment) * 100, 2)
        event_type = classify_event_type(clean_title)

        results.append(
            {
                "id": str(row["url"]) if "url" in df.columns and pd.notna(row["url"]) else str(uuid.uuid4()),
                "published_at": row["published_at"].to_pydatetime(),
                "title": title,
                "source": str(row["source"]) if "source" in df.columns and pd.notna(row["source"]) else "Unknown",
                "url": str(row["url"]) if "url" in df.columns and pd.notna(row["url"]) else "",
                "commodity": str(row["commodity"]).upper() if "commodity" in row else commodity.upper(),
                "sentiment_score": round(sentiment, 4),
                "event_type": event_type,
                "impact_score": impact_score,
                "pred_label": pred_label,
                "pred_confidence": pred_confidence,
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

