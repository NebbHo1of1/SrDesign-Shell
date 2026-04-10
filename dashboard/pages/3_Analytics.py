"""
Shell S.I.G.N.A.L. — Analytics

Executive analytics dashboard: model metrics, prediction distribution,
sentiment vs price scatter, event type donut, impact timeline.
"""

from datetime import datetime

import streamlit as st

from components.api import fetch_analytics, fetch_headlines, load_model_report, safe_fetch
from components.charts import (
    event_type_donut,
    impact_timeline,
    label_distribution,
    sentiment_vs_next_move,
)
from components.sidebar import render_sidebar
from components.theme import inject_shell_css

inject_shell_css()

st.markdown(
    """
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:4px;">
        <h1 style="margin:0;">Analytics</h1>
    </div>
    <p style="color:#94A3B8; font-size:0.85rem; margin-top:0;">
        Executive-level analytics: model performance, signal distribution, and market correlations
    </p>
    """,
    unsafe_allow_html=True,
)

filters = st.session_state.get("filters") or render_sidebar()
since_iso = datetime.combine(filters["since_date"], datetime.min.time()).isoformat()

headlines, h_err = safe_fetch(fetch_headlines, filters["commodity"], since_iso)
analytics_data, a_err = safe_fetch(fetch_analytics, filters["commodity"])
report = load_model_report()

# ── Model Performance KPIs ───────────────────────────────────────────
st.markdown("### Model Performance")

metrics = report.get("classification_metrics", {})
m1, m2, m3, m4 = st.columns(4)
m1.metric("Accuracy", f"{report.get('accuracy', 0):.1f}%")
m2.metric("Precision", f"{metrics.get('precision', 0):.2f}")
m3.metric("Recall", f"{metrics.get('recall', 0):.2f}")
m4.metric("F1 Score", f"{metrics.get('f1_score', 0):.2f}")

if report.get("timestamp"):
    st.caption(f"Model trained: {report['timestamp']}")

st.markdown("---")

# ── Charts ───────────────────────────────────────────────────────────
if h_err:
    st.warning(f"Headlines unavailable: {h_err}")
    headlines = []

if not headlines:
    st.info("No headline data for this selection.")
else:
    # Two-column layout: prediction dist + event donut
    col_left, col_right = st.columns(2)

    with col_left:
        st.markdown("### Prediction Distribution")
        label_fig = label_distribution(headlines)
        if label_fig:
            st.plotly_chart(label_fig, use_container_width=True)

    with col_right:
        st.markdown("### Event Type Breakdown")
        donut_fig = event_type_donut(headlines)
        if donut_fig:
            st.plotly_chart(donut_fig, use_container_width=True)

    # Sentiment vs price change
    st.markdown("### Sentiment vs Next Price Move")
    if a_err:
        st.warning(f"Analytics unavailable: {a_err}")
    elif analytics_data:
        scatter_fig = sentiment_vs_next_move(analytics_data)
        if scatter_fig:
            st.plotly_chart(scatter_fig, use_container_width=True)

    # High-impact timeline
    st.markdown("### High-Impact Events")
    timeline_fig = impact_timeline(headlines)
    if timeline_fig:
        st.plotly_chart(timeline_fig, use_container_width=True)
    else:
        st.info("No high-impact events (Impact ≥ 70) in this time window.")
