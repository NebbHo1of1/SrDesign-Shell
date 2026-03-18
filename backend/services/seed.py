from sqlalchemy.orm import Session

from backend.models import Headline, PricePoint
from backend.services.news_service import fetch_real_headlines
from backend.services.price_service import fetch_real_price_points


SUPPORTED_COMMODITIES = ["WTI", "BRENT", "NATGAS"]


def seed_database(db: Session) -> dict:
    # clear old data
    db.query(Headline).delete()
    db.query(PricePoint).delete()

    total_headlines = 0
    total_prices = 0

    for commodity in SUPPORTED_COMMODITIES:
        # REAL news
        headlines = fetch_real_headlines(commodity=commodity, page_size=40)

        # REAL prices
        prices = fetch_real_price_points(commodity=commodity, days=45)

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
    }
