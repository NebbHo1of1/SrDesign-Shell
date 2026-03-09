from datetime import datetime, timedelta
import random

from sqlalchemy.orm import Session

from backend.models import PricePoint


RANGE_TO_DAYS = {
    "7d": 7,
    "14d": 14,
    "30d": 30,
}


def generate_price_curve(commodity: str, days: int = 30, seed: int = 42) -> list[PricePoint]:
    random.seed(seed)
    now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    total_points = days * 24
    start_price = 75.0 if commodity == "WTI" else 85.0
    trend = 0.015

    points: list[PricePoint] = []
    current = start_price
    for i in range(total_points):
        timestamp = now - timedelta(hours=total_points - i)
        shock = random.uniform(-0.8, 0.8)
        current = max(20.0, current + trend + shock * 0.2)
        points.append(PricePoint(commodity=commodity, timestamp=timestamp, close=round(current, 2)))
    return points


def get_prices_for_range(db: Session, commodity: str, range_str: str) -> list[PricePoint]:
    days = RANGE_TO_DAYS.get(range_str, 7)
    since = datetime.utcnow() - timedelta(days=days)
    return (
        db.query(PricePoint)
        .filter(PricePoint.commodity == commodity, PricePoint.timestamp >= since)
        .order_by(PricePoint.timestamp.asc())
        .all()
    )
