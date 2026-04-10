"""
Shell S.I.G.N.A.L. — Centralized API Client

All backend interactions go through cached helpers here so pages stay clean.
"""

import json
import os
from datetime import datetime, timedelta

import requests
import streamlit as st

API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")
_MODEL_REPORT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "model_training_report.json",
)


def _get(path: str, params: dict | None = None, timeout: int = 10):
    """Fire a GET request; raise on HTTP errors."""
    resp = requests.get(f"{API_BASE_URL}{path}", params=params, timeout=timeout)
    resp.raise_for_status()
    return resp.json()


@st.cache_data(ttl=60)
def fetch_headlines(commodity: str, since_iso: str, limit: int = 200) -> list[dict]:
    return _get("/headlines", {"commodity": commodity, "since": since_iso, "limit": limit})


@st.cache_data(ttl=60)
def fetch_prices(commodity: str, range_days: int) -> dict:
    return _get("/prices", {"commodity": commodity, "range": f"{range_days}d"})


@st.cache_data(ttl=60)
def fetch_kpis(commodity: str) -> dict:
    return _get("/kpis", {"commodity": commodity})


@st.cache_data(ttl=60)
def fetch_analytics(commodity: str) -> list[dict]:
    return _get("/analytics/sentiment-price", {"commodity": commodity})


@st.cache_data(ttl=300)
def load_model_report() -> dict:
    """Load the model training report from disk."""
    try:
        with open(_MODEL_REPORT_PATH) as fh:
            raw = fh.read().strip()
            # The file may store JSON inside an escaped string (double-encoded)
            # First attempt: direct parse
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                # Remove outer quotes and unescape
                if raw.startswith("'") or raw.startswith('"'):
                    raw = raw[1:-1]
                raw = raw.replace("\\n", "\n").replace('\\"', '"')
                data = json.loads(raw)
            if isinstance(data, str):
                data = json.loads(data)
            return data
    except Exception:
        return {
            "accuracy": 0,
            "feature_importances": {},
            "classification_metrics": {"precision": 0, "recall": 0, "f1_score": 0},
            "timestamp": "N/A",
        }


def safe_fetch(fetcher, *args, **kwargs):
    """Wrap an API call; return (data, error_message | None)."""
    try:
        return fetcher(*args, **kwargs), None
    except requests.ConnectionError:
        return None, "Cannot reach API server. Start it with `uvicorn backend.main:app`."
    except requests.HTTPError as exc:
        return None, f"API error: {exc.response.status_code}"
    except Exception as exc:
        return None, f"Unexpected error: {exc}"


def default_since_iso(days: int = 30) -> str:
    return (datetime.utcnow() - timedelta(days=days)).isoformat()
