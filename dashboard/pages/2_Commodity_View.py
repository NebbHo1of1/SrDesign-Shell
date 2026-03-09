from datetime import datetime
import os

import requests
import streamlit as st

from dashboard.components.charts import price_with_headline_markers, sentiment_over_time
from dashboard.components.sidebar import render_sidebar

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")


@st.cache_data(ttl=60)
def fetch_prices(commodity: str, range_days: int):
    response = requests.get(
        f"{API_BASE_URL}/prices",
        params={"commodity": commodity, "range": f"{range_days}d"},
        timeout=10,
    )
    response.raise_for_status()
    return response.json()


@st.cache_data(ttl=60)
def fetch_headlines(commodity: str, since_iso: str):
    response = requests.get(
        f"{API_BASE_URL}/headlines",
        params={"commodity": commodity, "since": since_iso, "limit": 100},
        timeout=10,
    )
    response.raise_for_status()
    return response.json()


st.title("Commodity View")
filters = st.session_state.get("filters") or render_sidebar()
since_iso = datetime.combine(filters["since_date"], datetime.min.time()).isoformat()

try:
    price_data = fetch_prices(filters["commodity"], filters["range_days"])
    headlines = fetch_headlines(filters["commodity"], since_iso)
except Exception as exc:
    st.error(f"API unavailable: {exc}")
    st.stop()

if not price_data.get("points"):
    st.info("No price points available yet. Please seed the API first.")
    st.stop()

latest = headlines[0] if headlines else None
col1, col2 = st.columns([2, 1])
with col2:
    st.subheader("Latest Prediction")
    if latest:
        st.metric("Label", latest["pred_label"])
        st.metric("Confidence", f"{latest['pred_confidence']:.2f}")
        st.caption(f"{latest['title']}")
    else:
        st.write("No recent headlines.")

with col1:
    fig = price_with_headline_markers(price_data["points"], headlines, filters["commodity"])
    st.plotly_chart(fig, use_container_width=True)

sent_fig = sentiment_over_time(headlines)
if sent_fig:
    st.plotly_chart(sent_fig, use_container_width=True)
