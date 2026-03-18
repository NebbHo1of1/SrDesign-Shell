from datetime import datetime
import os

import requests
import streamlit as st

from components.charts import label_distribution, sentiment_vs_next_move
from components.sidebar import render_sidebar

API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")


def fetch_headlines(commodity: str, since_iso: str):
    response = requests.get(
        f"{API_BASE_URL}/headlines",
        params={"commodity": commodity, "since": since_iso, "limit": 200},
        timeout=10,
    )
    response.raise_for_status()
    return response.json()


def fetch_analytics(commodity: str):
    response = requests.get(
        f"{API_BASE_URL}/analytics/sentiment-price",
        params={"commodity": commodity},
        timeout=10,
    )
    response.raise_for_status()
    return response.json()


st.title("Analytics")

filters = st.session_state.get("filters") or render_sidebar()
since_iso = datetime.combine(filters["since_date"], datetime.min.time()).isoformat()

try:
    headlines = fetch_headlines(filters["commodity"], since_iso)
    analytics_data = fetch_analytics(filters["commodity"])
except Exception as exc:
    st.error(f"API unavailable: {exc}")
    st.stop()

if not headlines:
    st.info("No headline data available for this selection.")
    st.stop()

st.subheader("Prediction Label Distribution")
label_fig = label_distribution(headlines)
if label_fig:
    st.plotly_chart(label_fig, use_container_width=True)

st.subheader("Sentiment vs Next Price Move")
analytics_fig = sentiment_vs_next_move(analytics_data)
if analytics_fig:
    st.plotly_chart(analytics_fig, use_container_width=True)

with st.expander("Debug Data"):
    st.write("Commodity:", filters["commodity"])
    st.write("Headline count:", len(headlines))
    st.write("Analytics rows:", len(analytics_data) if analytics_data else 0)
