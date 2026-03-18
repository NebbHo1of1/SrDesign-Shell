from datetime import datetime
import os

import requests
import streamlit as st

from components.charts import price_with_headline_markers, sentiment_over_time
from components.sidebar import render_sidebar

API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")


def fetch_prices(commodity: str, range_days):
    if isinstance(range_days, str):
        range_value = range_days.lower().strip()
    else:
        range_value = f"{range_days}d"

    response = requests.get(
        f"{API_BASE_URL}/prices",
        params={"commodity": commodity, "range": range_value},
        timeout=10,
    )
    response.raise_for_status()
    return response.json()


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

points = price_data.get("points", [])

if not points:
    st.info("No price points available for this selection.")
    st.write("Debug price_data:", price_data)
    st.write("Commodity:", filters["commodity"])
    st.write("Range days:", filters["range_days"])
    st.write("Range type:", type(filters["range_days"]).__name__)
    st.stop()

latest = headlines[0] if headlines else None

col1, col2 = st.columns([2, 1])

with col2:
    st.subheader("Latest Prediction")
    if latest:
        st.metric("Label", latest["pred_label"])
        st.metric("Confidence", f"{latest['pred_confidence']:.2f}")
        st.caption(latest["title"])
    else:
        st.write("No recent headlines.")

with col1:
    fig = price_with_headline_markers(points, headlines, filters["commodity"])
    st.plotly_chart(fig, use_container_width=True)

sent_fig = sentiment_over_time(headlines)
if sent_fig:
    st.plotly_chart(sent_fig, use_container_width=True)

with st.expander("Debug Data"):
    st.write("Commodity:", filters["commodity"])
    st.write("Range days:", filters["range_days"])
    st.write("Range type:", type(filters["range_days"]).__name__)
    st.write("Price data:", price_data)
    st.write("Headline count:", len(headlines))
