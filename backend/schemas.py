from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class HeadlineOut(BaseModel):
    id: str
    published_at: datetime
    title: str
    source: str
    url: str
    commodity: str
    sentiment_score: float
    event_type: str
    impact_score: float
    pred_label: Literal["UP", "DOWN", "NEUTRAL"]
    pred_confidence: float

    model_config = {"from_attributes": True}


class PricePointOut(BaseModel):
    timestamp: datetime
    close: float

    model_config = {"from_attributes": True}


class PriceSeriesOut(BaseModel):
    commodity: str
    points: list[PricePointOut]


class KPIOut(BaseModel):
    avg_sentiment_24h: float
    high_impact_count_24h: int
    last_prediction: str | None
    last_confidence: float | None
    total_headlines_24h: int
