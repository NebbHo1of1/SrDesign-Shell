from datetime import date, timedelta

import streamlit as st


DEFAULT_COMMODITIES = ["WTI", "BRENT", "NATGAS"]


def render_sidebar() -> dict:
    st.sidebar.title("Controls")
    commodity = st.sidebar.selectbox("Commodity", DEFAULT_COMMODITIES, index=0)
    range_days = st.sidebar.selectbox("Date range", [7, 14, 30], index=0)
    min_confidence = st.sidebar.slider("Min confidence", min_value=0.0, max_value=1.0, value=0.55, step=0.05)
    sentiment_filter = st.sidebar.multiselect(
        "Sentiment bands",
        ["Negative", "Neutral", "Positive"],
        default=["Negative", "Neutral", "Positive"],
    )
    today = date.today()
    since_date = st.sidebar.date_input("Since date", value=today - timedelta(days=range_days), max_value=today)

    return {
        "commodity": commodity,
        "range_days": range_days,
        "min_confidence": min_confidence,
        "sentiment_filter": sentiment_filter,
        "since_date": since_date,
    }
