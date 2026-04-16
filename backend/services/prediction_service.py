"""Prediction service — loads the trained model from train_model.py and
provides market-direction predictions for the SIGNAL dashboard.

The trained RandomForest (or whichever variant was selected via
``python train_model.py --model <type>``) is persisted as
``models/prediction_model.joblib``.  This module mirrors the exact
feature-engineering pipeline from ``train_model.py`` so that live data
passes through the same transformations before reaching the model.
"""

from __future__ import annotations

import json
import logging
import math
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from backend.models import Headline, PricePoint

log = logging.getLogger(__name__)

# ── Paths ────────────────────────────────────────────────────────────────
_ROOT = Path(__file__).resolve().parent.parent.parent  # repo root
_MODEL_PATH = _ROOT / "models" / "prediction_model.joblib"
_SCALER_PATH = _ROOT / "models" / "scaler.joblib"
_FEATURES_PATH = _ROOT / "models" / "feature_names.json"
_REPORT_PATH = _ROOT / "models" / "model_report.json"

# ── Lazy-loaded singletons ───────────────────────────────────────────────
_model = None
_scaler = None
_feature_names: list[str] | None = None


def _load_model():
    """Load the trained model, scaler (if any), and expected feature names."""
    global _model, _scaler, _feature_names  # noqa: PLW0603

    if not _MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Trained model not found at {_MODEL_PATH}.  "
            "Run `python train_model.py` first."
        )

    _model = joblib.load(_MODEL_PATH)
    log.info("Loaded model from %s", _MODEL_PATH)

    if _SCALER_PATH.exists():
        _scaler = joblib.load(_SCALER_PATH)
        log.info("Loaded scaler from %s", _SCALER_PATH)

    if _FEATURES_PATH.exists():
        with open(_FEATURES_PATH) as f:
            _feature_names = json.load(f)
        log.info("Loaded %d feature names", len(_feature_names))
    else:
        raise FileNotFoundError(
            f"Feature names not found at {_FEATURES_PATH}.  "
            "Regenerate with train_model.py."
        )


def get_model():
    """Return the loaded model (lazy-init on first call)."""
    if _model is None:
        _load_model()
    return _model


def get_feature_names() -> list[str]:
    if _feature_names is None:
        _load_model()
    assert _feature_names is not None
    return _feature_names


def get_model_report() -> dict[str, Any]:
    """Return the model training report as a dict."""
    if _REPORT_PATH.exists():
        with open(_REPORT_PATH) as f:
            return json.load(f)
    raise FileNotFoundError(f"Model report not found at {_REPORT_PATH}")


# ── Feature engineering (mirrors train_model.py exactly) ─────────────────

def _engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Apply the same feature engineering as train_model.py.

    Expects a DataFrame with at least: price, price_lag_1, price_lag_2,
    price_ma_3, price_ma_5, avg_tone, volatility_5, article_count, date.
    """
    df = df.copy()

    # Downside pressure features
    df["neg_tone_flag"] = (df["avg_tone"] < 0).astype(int)
    df["strong_neg_tone"] = (df["avg_tone"] < -0.5).astype(int)

    # Volatility direction signal
    df["volatility_spike"] = (
        df["volatility_5"] > df["volatility_5"].rolling(5).mean()
    ).astype(int)

    # Price drop signal
    df["down_momentum"] = (df["price"] < df["price_lag_1"]).astype(int)

    # Price difference features
    df["price_diff_1"] = df["price"] - df["price_lag_1"]
    df["price_diff_2"] = df["price_lag_1"] - df["price_lag_2"]

    # Sentiment rolling features
    df["tone_ma_3"] = df["avg_tone"].rolling(3).mean()
    df["tone_x_volatility"] = df["avg_tone"] * df["volatility_5"]

    # Short-term momentum
    df["return_1"] = df["price"].pct_change()
    df["return_2"] = df["price"].pct_change(2)

    # Trend strength
    df["trend_strength"] = df["price_ma_3"] - df["price_ma_5"]

    # Acceleration
    df["acceleration"] = df["return_1"] - df["return_2"]

    # Sentiment change
    df["tone_change"] = df["avg_tone"] - df["avg_tone"].shift(1)

    # 3-period momentum
    df["momentum_3"] = df["price"] - df["price_lag_2"]

    # Stationary ratio features
    df["price_vs_ma5"] = df["price"] / df["price_ma_5"] - 1
    df["ma3_vs_ma5"] = df["price_ma_3"] / df["price_ma_5"] - 1

    # MACD
    _ema12 = df["price"].ewm(span=12, adjust=False).mean()
    _ema26 = df["price"].ewm(span=26, adjust=False).mean()
    df["macd"] = _ema12 - _ema26
    df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean()
    df["macd_hist"] = df["macd"] - df["macd_signal"]
    df["price_vs_ema12"] = _ema12 / df["price"] - 1
    df["ema12_vs_ema26"] = _ema12 / _ema26 - 1

    # RSI
    _delta = df["price"].diff()
    _avg_gain = _delta.clip(lower=0).ewm(com=13, adjust=False).mean()
    _avg_loss = (-_delta.clip(upper=0)).ewm(com=13, adjust=False).mean()
    df["rsi"] = 100 - (100 / (1 + _avg_gain / _avg_loss.replace(0, float("nan"))))
    df["rsi_norm"] = (df["rsi"] - 50) / 50
    df["rsi_overbought"] = (df["rsi"] > 70).astype(int)
    df["rsi_oversold"] = (df["rsi"] < 30).astype(int)

    # Cyclical calendar encoding
    df["date"] = pd.to_datetime(df["date"])
    df["month_sin"] = df["date"].dt.month.apply(
        lambda m: math.sin(2 * math.pi * m / 12)
    )
    df["month_cos"] = df["date"].dt.month.apply(
        lambda m: math.cos(2 * math.pi * m / 12)
    )

    # Sentiment × technical interactions
    df["macd_x_tone"] = df["macd_hist"] * df["avg_tone"]
    df["rsi_x_tone"] = df["rsi_norm"] * df["avg_tone"]
    df["macd_x_vol"] = df["macd_hist"] * df["volatility_5"]

    return df


def _build_feature_df_from_db(db: Session, commodity: str = "WTI") -> pd.DataFrame:
    """Build a time-series DataFrame from DB price + headline data.

    Returns a DataFrame with one row per day, containing the base features
    needed by ``_engineer_features``.
    """
    commodity = commodity.upper()

    # Get price history (last 60 days to have enough for rolling windows)
    cutoff = datetime.utcnow() - timedelta(days=60)
    prices = (
        db.query(PricePoint)
        .filter(PricePoint.commodity == commodity, PricePoint.timestamp >= cutoff)
        .order_by(PricePoint.timestamp.asc())
        .all()
    )

    if len(prices) < 5:
        raise ValueError(
            f"Not enough price data for {commodity} — need at least 5 points, "
            f"got {len(prices)}.  Run /seed first."
        )

    # Build daily price DataFrame
    price_records = [{"date": p.timestamp.date(), "price": p.close} for p in prices]
    pdf = pd.DataFrame(price_records)
    pdf["date"] = pd.to_datetime(pdf["date"])
    pdf = pdf.groupby("date").last().reset_index().sort_values("date")

    # Compute base price features (same as training table)
    pdf["price_lag_1"] = pdf["price"].shift(1)
    pdf["price_lag_2"] = pdf["price"].shift(2)
    pdf["price_change_1"] = pdf["price"] - pdf["price_lag_1"]
    pdf["return_1"] = pdf["price"].pct_change()
    pdf["price_ma_3"] = pdf["price"].rolling(3).mean()
    pdf["price_ma_5"] = pdf["price"].rolling(5).mean()
    pdf["volatility_5"] = pdf["return_1"].rolling(5).std()

    # Aggregate daily news sentiment
    headlines = (
        db.query(Headline)
        .filter(Headline.commodity == commodity, Headline.published_at >= cutoff)
        .all()
    )

    if headlines:
        hdf = pd.DataFrame([
            {"date": h.published_at.date(), "sentiment": h.sentiment_score}
            for h in headlines
        ])
        hdf["date"] = pd.to_datetime(hdf["date"])
        daily_news = hdf.groupby("date").agg(
            article_count=("sentiment", "count"),
            avg_tone=("sentiment", "mean"),
        ).reset_index()
    else:
        # Fallback: no headlines — use neutral sentiment
        daily_news = pd.DataFrame({
            "date": pdf["date"],
            "article_count": 0,
            "avg_tone": 0.0,
        })

    # Merge price + news
    df = pdf.merge(daily_news, on="date", how="left")
    df["article_count"] = df["article_count"].fillna(0).astype(int)
    df["avg_tone"] = df["avg_tone"].fillna(0.0)

    return df


def predict_market_direction(
    db: Session,
    commodity: str = "WTI",
    threshold: float = 0.55,
) -> dict[str, Any]:
    """Run the trained model on live DB data and return a prediction.

    Returns a dict with:
        - prediction: "UP" | "DOWN" | "UNCERTAIN"
        - confidence: float (probability of the predicted class)
        - probability_up: float (raw P(UP))
        - features_used: int (number of features)
        - model_type: str
        - timestamp: str (ISO)
    """
    model = get_model()
    feature_names = get_feature_names()

    # Build features from DB data
    df = _build_feature_df_from_db(db, commodity)
    df = _engineer_features(df)

    # Drop NaN rows (from rolling windows)
    df = df.dropna()

    if df.empty:
        raise ValueError(
            "No valid feature rows after engineering — "
            "not enough historical data in the DB."
        )

    # Take the most recent row
    latest = df.iloc[[-1]]

    # Select only the features the model expects, in the correct order
    try:
        X = latest[feature_names]
    except KeyError as exc:
        missing = set(feature_names) - set(latest.columns)
        raise ValueError(
            f"Missing features for model input: {missing}"
        ) from exc

    # Apply scaler if present (for logistic regression variant)
    if _scaler is not None:
        X = pd.DataFrame(_scaler.transform(X), columns=feature_names)

    # Predict
    prob_up = float(model.predict_proba(X)[0, 1])

    if prob_up >= threshold:
        label = "UP"
        confidence = prob_up
    elif prob_up <= (1.0 - threshold):
        label = "DOWN"
        confidence = 1.0 - prob_up
    else:
        label = "UNCERTAIN"
        confidence = max(prob_up, 1.0 - prob_up)

    return {
        "prediction": label,
        "confidence": round(confidence, 4),
        "probability_up": round(prob_up, 4),
        "commodity": commodity,
        "features_used": len(feature_names),
        "model_type": type(model).__name__,
        "timestamp": datetime.utcnow().isoformat(),
    }
