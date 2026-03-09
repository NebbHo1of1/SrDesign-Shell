import os

import requests
import streamlit as st

from dashboard.components.charts import label_distribution, sentiment_vs_next_move
from dashboard.components.sidebar import render_sidebar

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")


@st.cache_data(ttl=60)
def fetch_kpis(commodity: str):
    resp = requests.get(f"{API_BASE_URL}/kpis", params={"commodity": commodity}, timeout=10)
    resp.raise_for_status()
    return resp.json()


@st.cache_data(ttl=60)
def fetch_headlines(commodity: str):
    resp = requests.get(f"{API_BASE_URL}/headlines", params={"commodity": commodity, "limit": 200}, timeout=10)
    resp.raise_for_status()
    return resp.json()


@st.cache_data(ttl=60)
def fetch_correlation_points(commodity: str):
    resp = requests.get(
        f"{API_BASE_URL}/analytics/sentiment-price", params={"commodity": commodity}, timeout=10
    )
    resp.raise_for_status()
    return resp.json()


st.title("Analytics")
filters = st.session_state.get("filters") or render_sidebar()

try:
    kpis = fetch_kpis(filters["commodity"])
    headlines = fetch_headlines(filters["commodity"])
    corr = fetch_correlation_points(filters["commodity"])
except Exception as exc:
    st.error(f"API unavailable: {exc}")
    st.stop()

c1, c2, c3, c4, c5 = st.columns(5)
c1.metric("Avg Sentiment (24h)", f"{kpis['avg_sentiment_24h']:.3f}")
c2.metric("High Impact (24h)", kpis["high_impact_count_24h"])
c3.metric("Last Prediction", kpis["last_prediction"] or "N/A")
c4.metric("Last Confidence", f"{(kpis['last_confidence'] or 0):.2f}")
c5.metric("Total Headlines (24h)", kpis["total_headlines_24h"])

fig_corr = sentiment_vs_next_move(corr)
if fig_corr:
    st.plotly_chart(fig_corr, use_container_width=True)
else:
    st.info("Not enough data for sentiment/price correlation yet.")

fig_dist = label_distribution(headlines)
if fig_dist:
    st.plotly_chart(fig_dist, use_container_width=True)
else:
    st.info("No headline labels available.")
