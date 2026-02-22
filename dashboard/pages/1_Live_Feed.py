from datetime import datetime
import os

import pandas as pd
import requests
import streamlit as st

from dashboard.components.sidebar import render_sidebar

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")


@st.cache_data(ttl=60)
def fetch_headlines(commodity: str, since_iso: str, limit: int = 200):
    response = requests.get(
        f"{API_BASE_URL}/headlines",
        params={"commodity": commodity, "since": since_iso, "limit": limit},
        timeout=10,
    )
    response.raise_for_status()
    return response.json()


st.title("Live Feed")
filters = st.session_state.get("filters") or render_sidebar()
since_iso = datetime.combine(filters["since_date"], datetime.min.time()).isoformat()

try:
    data = fetch_headlines(filters["commodity"], since_iso)
except Exception as exc:
    st.error(f"API unavailable: {exc}")
    st.stop()

if not data:
    st.info("No headlines found for selected filters.")
    st.stop()

df = pd.DataFrame(data)

if filters["sentiment_filter"]:
    mask = pd.Series([False] * len(df))
    if "Negative" in filters["sentiment_filter"]:
        mask |= df["sentiment_score"] < -0.15
    if "Neutral" in filters["sentiment_filter"]:
        mask |= (df["sentiment_score"] >= -0.15) & (df["sentiment_score"] <= 0.15)
    if "Positive" in filters["sentiment_filter"]:
        mask |= df["sentiment_score"] > 0.15
    df = df[mask]

df = df[df["pred_confidence"] >= filters["min_confidence"]]
df = df.sort_values("published_at", ascending=False)

if df.empty:
    st.info("All headlines were filtered out. Relax filters to see more.")
    st.stop()

def label_badge(label: str):
    color = {"UP": "🟢", "DOWN": "🔴", "NEUTRAL": "🟡"}.get(label, "⚪")
    return f"{color} {label}"


df["pred_label"] = df["pred_label"].map(label_badge)
df["url"] = df["url"].map(lambda u: f"[Open]({u})")

st.dataframe(
    df[
        [
            "published_at",
            "title",
            "source",
            "commodity",
            "sentiment_score",
            "event_type",
            "impact_score",
            "pred_label",
            "pred_confidence",
            "url",
        ]
    ],
    use_container_width=True,
    hide_index=True,
)

with st.expander("View row details"):
    picked_id = st.selectbox("Headline ID", df["id"].tolist())
    row = df[df["id"] == picked_id].iloc[0]
    st.json(row.to_dict())
