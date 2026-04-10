import logging

from sqlalchemy.orm import Session

from backend.models import Headline, PricePoint
from backend.services.news_service import fetch_real_headlines, generate_headlines
from backend.services.price_service import fetch_real_price_points, generate_price_points

logger = logging.getLogger(__name__)

SUPPORTED_COMMODITIES = ["WTI", "BRENT", "NATGAS"]


def seed_database(db: Session) -> dict:
    # clear old data
    db.query(Headline).delete()
    db.query(PricePoint).delete()

    total_headlines = 0
    total_prices = 0
    used_fallback = False

    for commodity in SUPPORTED_COMMODITIES:
        # Attempt REAL news, fall back to synthetic
        try:
            headlines = fetch_real_headlines(commodity=commodity, page_size=40)
        except Exception as exc:
            logger.warning("Real headlines unavailable for %s (%s), using synthetic data", commodity, exc)
            headlines = generate_headlines(commodity=commodity, count=40)
            used_fallback = True

        # Attempt REAL prices, fall back to synthetic
        try:
            prices = fetch_real_price_points(commodity=commodity, days=45)
        except Exception as exc:
            logger.warning("Real prices unavailable for %s (%s), using synthetic data", commodity, exc)
            prices = generate_price_points(commodity=commodity, days=45)
            used_fallback = True

        db.add_all(headlines)
        db.add_all(prices)

        total_headlines += len(headlines)
        total_prices += len(prices)

    db.commit()

    return {
        "status": "seeded",
        "commodities": SUPPORTED_COMMODITIES,
        "headlines": total_headlines,
        "price_points": total_prices,
        "fallback_used": used_fallback,
    }
