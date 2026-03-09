import streamlit as st

from dashboard.components.sidebar import render_sidebar

st.set_page_config(page_title="Commodity Insight Dashboard", page_icon="📈", layout="wide")
st.title("Senior Design: News-Driven Commodity Insight")

filters = render_sidebar()
st.session_state["filters"] = filters

st.markdown(
    """
Welcome to the MVP dashboard.

Use the sidebar filters, then navigate pages:
- **Live Feed** for latest headlines
- **Commodity View** for price/news overlay
- **Analytics** for KPIs + diagnostics
"""
)
