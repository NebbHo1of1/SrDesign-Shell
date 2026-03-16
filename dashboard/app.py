import streamlit as st
import pandas as pd

from components.sidebar import render_sidebar

st.set_page_config(page_title="Commodity Insight Dashboard", page_icon="📈", layout="wide")
st.title("Senior Design: News-Driven Commodity Insight")

filters = render_sidebar()
st.session_state["filters"] = filters

df = pd.read_parquet("data/processed/news_table.parquet")

st.subheader("Latest News from Ingestion Pipeline")
st.dataframe(df[["date", "source", "title"]].head(20), use_container_width=True)

st.markdown(
    """
Welcome to the MVP dashboard.

Use the sidebar filters, then navigate pages:
- **Live Feed** for latest headlines
- **Commodity View** for price/news overlay
- **Analytics** for KPIs + diagnostics
"""
)
