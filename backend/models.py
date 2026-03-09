from sqlalchemy import Column, DateTime, Float, Integer, String

from .db import Base


class Headline(Base):
    __tablename__ = "headlines"

    id = Column(String, primary_key=True, index=True)
    published_at = Column(DateTime, index=True, nullable=False)
    title = Column(String, nullable=False)
    source = Column(String, nullable=False)
    url = Column(String, nullable=False)
    commodity = Column(String, index=True, nullable=False)
    sentiment_score = Column(Float, nullable=False)
    event_type = Column(String, nullable=False)
    impact_score = Column(Float, nullable=False)
    pred_label = Column(String, nullable=False)
    pred_confidence = Column(Float, nullable=False)


class PricePoint(Base):
    __tablename__ = "price_points"

    id = Column(Integer, primary_key=True, index=True)
    commodity = Column(String, index=True, nullable=False)
    timestamp = Column(DateTime, index=True, nullable=False)
    close = Column(Float, nullable=False)
