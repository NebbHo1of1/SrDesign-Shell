from sqlalchemy.orm import Session

from backend.models import Headline, PricePoint
from backend.services.news_service import generate_headlines
from backend.services.price_service import generate_price_curve


SUPPORTED_COMMODITIES = ["WTI", "BRENT", "NATGAS"]


def seed_database(db: Session) -> dict:
    db.query(Headline).delete()
    db.query(PricePoint).delete()

    total_headlines = 0
    total_prices = 0
    for idx, commodity in enumerate(SUPPORTED_COMMODITIES):
        headlines = generate_headlines(commodity=commodity, count=120, seed=40 + idx)
        prices = generate_price_curve(commodity=commodity, days=30, seed=10 + idx)
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
