from datetime import datetime, timedelta
import os
import random
import re
import uuid

import requests
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from backend.models import Headline, PricePoint

load_dotenv()

NEWS_API_KEY = os.getenv("NEWS_API_KEY")

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

NEWS_QUERY_MAP = {
    "WTI": '"WTI" OR "West Texas Intermediate" OR crude oil OR oil prices',
    "BRENT": '"Brent" OR "Brent crude" OR crude oil OR oil prices',
    "NATGAS": '"natural gas" OR "Henry Hub" OR LNG OR gas prices',
}

EVENT_KEYWORDS = {
    "Geopolitics": [
        "war", "sanction", "conflict", "iran", "russia", "ukraine",
        "middle east", "attack", "military", "tariff", "ceasefire",
        "export ban", "tensions",
    ],
    "Supply": [
        "opec", "production cut", "output cut", "refinery outage",
        "pipeline outage", "shutdown", "disruption", "inventory draw",
        "export drop", "maintenance", "supply cut", "inventory build",
        "refinery", "pipeline", "output", "production", "supply",
        "exports", "imports",
    ],
    "Demand": [
        "demand", "consumption", "import growth", "economic growth",
        "travel demand", "jet fuel demand", "gasoline demand",
        "industrial activity", "china demand", "outlook",
        "recovery", "usage",
    ],
    "Macro": [
        "inflation", "interest rate", "fed", "recession", "gdp",
        "cpi", "unemployment", "dollar", "economic slowdown", "rate path",
        "central bank", "growth",
    ],
    "Weather": [
        "hurricane", "storm", "heatwave", "cold snap", "freeze",
        "flood", "wildfire", "weather", "hurricane risk",
    ],
    "Regulatory": [
        "regulation", "policy", "ban", "restriction", "approval",
        "compliance", "law", "government rule", "epa", "rules",
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

    text = re.sub(r"<[^>]+>", " ", text)

    text = re.sub(r"\bu\.s\.\b", " us ", text)
    text = re.sub(r"\bu\.s\b", " us ", text)
    text = re.sub(r"\buk\b", " uk ", text)

    text = re.sub(r"\bbrent crude\b", " brent ", text)
    text = re.sub(r"\bwti crude\b", " wti ", text)
    text = re.sub(r"\bwest texas intermediate\b", " wti ", text)
    text = re.sub(r"\bhenry hub\b", " henry_hub ", text)
    text = re.sub(r"\bnatural gas\b", " natural_gas ", text)
    text = re.sub(r"\bcrude oil\b", " crude_oil ", text)
    text = re.sub(r"\boil prices\b", " oil_price ", text)
    text = re.sub(r"\bgas prices\b", " gas_price ", text)

    text = re.sub(r"\binterest rates\b", " interest_rate ", text)
    text = re.sub(r"\brate cut\b", " rate_cut ", text)
    text = re.sub(r"\brate cuts\b", " rate_cut ", text)
    text = re.sub(r"\brate hike\b", " rate_hike ", text)
    text = re.sub(r"\brate hikes\b", " rate_hike ", text)

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

    text = re.sub(r"[^a-z0-9\s$%._\-]", " ", text)
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def classify_event_type(text: str) -> tuple[str, list[str]]:
    text_lower = text.lower()

    best_type = "Other"
    best_matches: list[str] = []

    for event_type, keywords in EVENT_KEYWORDS.items():
        current_matches = [keyword for keyword in keywords if keyword in text_lower]
        if len(current_matches) > len(best_matches):
            best_type = event_type
            best_matches = current_matches

    return best_type, best_matches


def calculate_relevance_score(text: str) -> float:
    text_lower = text.lower()
    matches = sum(1 for term in RELEVANCE_TERMS if term in text_lower)
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


def fetch_real_headlines(commodity: str, page_size: int = 40) -> list[Headline]:
    commodity = commodity.upper()

    if not NEWS_API_KEY:
        raise ValueError("NEWS_API_KEY is missing. Add it to your .env file.")

    query = NEWS_QUERY_MAP.get(commodity, commodity)

    response = requests.get(
        "https://newsapi.org/v2/everything",
        params={
            "q": query,
            "language": "en",
            "sortBy": "publishedAt",
            "pageSize": page_size,
            "searchIn": "title,description",
        },
        headers={
            "X-Api-Key": NEWS_API_KEY,
            "X-No-Cache": "true",
        },
        timeout=20,
    )
    response.raise_for_status()
    data = response.json()

    articles = data.get("articles", [])
    headlines: list[Headline] = []

    for article in articles:
        title = (article.get("title") or "").strip()
        url = article.get("url") or ""
        source_name = (article.get("source") or {}).get("name", "Unknown")
        published_raw = article.get("publishedAt")

        if not title or not published_raw:
            continue

        try:
            published_at = datetime.fromisoformat(
                published_raw.replace("Z", "+00:00")
            ).replace(tzinfo=None)
        except Exception:
            continue

        clean_title = preprocess_text(title)
        sentiment = analyzer.polarity_scores(clean_title)["compound"]
        event_type, matched_keywords = classify_event_type(clean_title)
        relevance_score = calculate_relevance_score(clean_title)
        impact_score = calculate_impact_score(sentiment, relevance_score, matched_keywords)
        pred_label, pred_confidence = _heuristic_prediction(sentiment, impact_score)

        headlines.append(
            Headline(
                id=str(uuid.uuid4()),
                published_at=published_at,
                title=title,
                source=source_name,
                url=url,
                commodity=commodity,
                sentiment_score=round(sentiment, 4),
                event_type=event_type,
                impact_score=impact_score,
                pred_label=pred_label,
                pred_confidence=pred_confidence,
            )
        )

    return headlines


def get_headlines(
    db: Session,
    commodity: str,
    limit: int = 50,
    since: datetime | None = None,
):
    query = db.query(Headline).filter(Headline.commodity == commodity.upper())

    if since is not None:
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

    results = []

    for h in headlines:
        current_price = (
            db.query(PricePoint)
            .filter(
                PricePoint.commodity == commodity,
                PricePoint.timestamp <= h.published_at,
            )
            .order_by(PricePoint.timestamp.desc())
            .first()
        )

        if not current_price or not current_price.close:
            current_price = (
                db.query(PricePoint)
                .filter(PricePoint.commodity == commodity)
                .order_by(PricePoint.timestamp.desc())
                .first()
            )

        if not current_price or not current_price.close:
            continue

        next_price = (
            db.query(PricePoint)
            .filter(
                PricePoint.commodity == commodity,
                PricePoint.timestamp > current_price.timestamp,
            )
            .order_by(PricePoint.timestamp.asc())
            .first()
        )

        if not next_price:
            next_price = current_price

        pct = ((next_price.close - current_price.close) / current_price.close) * 100 if current_price.close else 0

        results.append(
            {
                "published_at": h.published_at.isoformat() if h.published_at else None,
                "title": h.title,
                "sentiment_score": h.sentiment_score,
                "pred_label": h.pred_label,
                "next_price_change": round(pct, 4),
            }
        )

    return results
