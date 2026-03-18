from datetime import datetime, timedelta
from io import StringIO

import pandas as pd
import requests
from sqlalchemy.orm import Session

from backend.models import PricePoint


RANGE_TO_DAYS = {
    "7d": 7,
    "14d": 14,
    "30d": 30,
}

SERIES_MAP = {
    "WTI": "DCOILWTICO",
    "BRENT": "DCOILBRENTEU",
    "NATGAS": "DHHNGSP",
}


def fetch_fred_series_csv(series_id: str) -> pd.DataFrame:
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
    response = requests.get(url, timeout=20)
    response.raise_for_status()

    df = pd.read_csv(StringIO(response.text))
    df.columns = ["date", "value"]

    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    df = df.dropna(subset=["date", "value"])

    return df


def fetch_real_price_points(commodity: str, days: int = 45) -> list[PricePoint]:
    commodity = commodity.upper()
    series_id = SERIES_MAP[commodity]
    df = fetch_fred_series_csv(series_id)

    cutoff = pd.Timestamp.utcnow().tz_localize(None) - pd.Timedelta(days=days)
    df = df[df["date"] >= cutoff].copy()

    points: list[PricePoint] = []
    for _, row in df.iterrows():
        points.append(
            PricePoint(
                commodity=commodity,
                timestamp=row["date"].to_pydatetime(),
                close=round(float(row["value"]), 2),
            )
        )

    return points


def get_prices_for_range(db: Session, commodity: str, range_str: str) -> list[PricePoint]:
    commodity = commodity.upper()
    days = RANGE_TO_DAYS.get(range_str.lower(), 7)
    since = datetime.utcnow() - timedelta(days=days)

    points = (
        db.query(PricePoint)
        .filter(PricePoint.commodity == commodity, PricePoint.timestamp >= since)
        .order_by(PricePoint.timestamp.asc())
        .all()
    )

    if points:
        return points

    return (
        db.query(PricePoint)
        .filter(PricePoint.commodity == commodity)
        .order_by(PricePoint.timestamp.desc())
        .limit(10)
        .all()[::-1]
    )
