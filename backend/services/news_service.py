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
        "middle east", "attack", "military", "tariff", "ceasefire",
        "export ban", "tensions"
    ],
    "Supply": [
        "opec", "production cut", "output cut", "refinery outage",
        "pipeline outage", "shutdown", "disruption", "inventory draw",
        "export drop", "maintenance", "supply cut", "inventory build",
        "refinery", "pipeline", "output", "production", "supply",
        "exports", "imports"
    ],
    "Demand": [
        "demand", "consumption", "import growth", "economic growth",
        "travel demand", "jet fuel demand", "gasoline demand",
        "industrial activity", "china demand", "outlook",
        "recovery", "usage"
    ],
    "Macro": [
        "inflation", "interest rate", "fed", "recession", "gdp",
        "cpi", "unemployment", "dollar", "economic slowdown", "rate path",
        "central bank", "growth"
    ],
    "Weather": [
        "hurricane", "storm", "heatwave", "cold snap", "freeze",
        "flood", "wildfire", "weather", "hurricane risk"
    ],
    "Regulatory": [
        "regulation", "policy", "ban", "restriction", "approval",
        "compliance", "law", "government rule", "epa", "rules"
    ],
}

RELEVANCE_TERMS = [
    "oil",
    "crude",
    "brent",
    "wti",
    "henry_hub",
    "natural_gas",
    "crude_oil",
    "opec",
    "refinery",
    "pipeline",
    "production",
    "inventory",
    "energy",
    "barrel",
    "exports",
    "imports",
    "gasoline",
    "jet fuel",
    "lng",
]

analyzer = SentimentIntensityAnalyzer()


def preprocess_text(text: str) -> str:
    text = str(text).lower()

    # remove html
    text = re.sub(r"<[^>]+>", " ", text)

    # normalize abbreviations
    text = re.sub(r"\bu\.s\.\b", " us ", text)
    text = re.sub(r"\bu\.s\b", " us ", text)
    text = re.sub(r"\buk\b", " uk ", text)

    # normalize energy phrases
    text = re.sub(r"\bbrent crude\b", " brent ", text)
    text = re.sub(r"\bwti crude\b", " wti ", text)
    text = re.sub(r"\bwest texas intermediate\b", " wti ", text)
    text = re.sub(r"\bhenry hub\b", " henry_hub ", text)
    text = re.sub(r"\bnatural gas\b", " natural_gas ", text)
    text = re.sub(r"\bcrude oil\b", " crude_oil ", text)
    text = re.sub(r"\boil prices\b", " oil_price ", text)
    text = re.sub(r"\bgas prices\b", " gas_price ", text)

    # normalize finance / macro phrases
    text = re.sub(r"\binterest rates\b", " interest_rate ", text)
    text = re.sub(r"\brate cut\b", " rate_cut ", text)
    text = re.sub(r"\brate cuts\b", " rate_cut ", text)
    text = re.sub(r"\brate hike\b", " rate_hike ", text)
    text = re.sub(r"\brate hikes\b", " rate_hike ", text)

    # normalize event phrases
    text = re.sub(r"\bproduction cuts\b", " production_cut ", text)
    text = re.sub(r"\bproduction cut\b", " production_cut ", text)
    text = re.sub(r"\boutput cuts\b", " output_cut ", text)
    text = re.sub(r"\boutput cut\b", " output_cut ", text)
    text = re.sub(r"\bsupply disruptions\b", " supply_disruption ", text)
    text = re.sub(r"\bsupply disruption\b", " supply_disruption ", text)
    text = re.sub(r"\bshipping disruptions\b", " shipping_disruption ", text)
    text = re.sub(r"\bshipping disruption\b", " shipping_disruption ", text)
    text = re.sub(r"\bpipeline outage\b", " pipeline_outage ", text)
    text = re.sub(r"\bpipeline outages\b", " pipeline_outage ", text)
    text = re.sub(r"\brefinery outage\b", " refinery_outage ", text)
    text = re.sub(r"\brefinery outages\b", " refinery_outage ", text)
    text = re.sub(r"\binventory build\b", " inventory_build ", text)
    text = re.sub(r"\binventory draw\b", " inventory_draw ", text)

    # keep useful characters
    text = re.sub(r"[^a-z0-9\s$%._\-]", " ", text)

    # collapse spaces
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def classify_event_type(text: str) -> tuple[str, list[str]]:
    text_lower = text.lower()

    best_type = "Other"
    best_matches = []

    for event_type, keywords in EVENT_KEYWORDS.items():
        current_matches = []

        for keyword in keywords:
            if keyword in text_lower:
                current_matches.append(keyword)

        if len(current_matches) > len(best_matches):
            best_type = event_type
            best_matches = current_matches

    return best_type, best_matches


def calculate_relevance_score(text: str) -> float:
    text_lower = text.lower()
    matches = 0

    for term in RELEVANCE_TERMS:
        if term in text_lower:
            matches += 1

    score = matches / len(RELEVANCE_TERMS)
    return round(min(score * 3, 1.0), 3)


def calculate_impact_score(sentiment: float, relevance_score: float, keyword_matches: list[str]) -> float:
    keyword_boost = min(len(keyword_matches) * 8, 24)
    sentiment_component = abs(sentiment) * 55
    relevance_component = relevance_score * 35

    score = sentiment_component + relevance_component + keyword_boost
    return round(min(score, 100.0), 2)


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

        event_type, matched_keywords = classify_event_type(clean_title)
        relevance_score = calculate_relevance_score(clean_title)
        impact_score = calculate_impact_score(sentiment, relevance_score, matched_keywords)
        pred_label, pred_confidence = _heuristic_prediction(sentiment, impact_score)

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
                "matched_keywords": matched_keywords,
                "relevance_score": relevance_score,
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

    return output
