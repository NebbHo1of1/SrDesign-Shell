"""
Shell S.I.G.N.A.L. — AI Model

Explainable AI page: model training report, feature importance,
pipeline explainer, confidence meter, and prediction audit.
"""

import streamlit as st

from components.api import load_model_report
from components.charts import feature_importance_bar
from components.theme import inject_shell_css

inject_shell_css()

st.markdown(
    """
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:4px;">
        <h1 style="margin:0;">AI Model</h1>
        <span class="pred-badge pred-up" style="font-size:0.7rem;">ACTIVE</span>
    </div>
    <p style="color:#94A3B8; font-size:0.85rem; margin-top:0;">
        Explainable AI — understand how S.I.G.N.A.L. generates predictions
    </p>
    """,
    unsafe_allow_html=True,
)

report = load_model_report()
metrics = report.get("classification_metrics", {})

# ── Model Report Card ────────────────────────────────────────────────
st.markdown("### Model Performance Report")

col1, col2, col3, col4 = st.columns(4)
col1.metric("Accuracy", f"{report.get('accuracy', 0):.1f}%")
col2.metric("Precision", f"{metrics.get('precision', 0):.2f}")
col3.metric("Recall", f"{metrics.get('recall', 0):.2f}")
col4.metric("F1 Score", f"{metrics.get('f1_score', 0):.2f}")

if report.get("timestamp"):
    st.caption(f"Last trained: {report['timestamp']}")

st.markdown("---")

# ── Feature Importance ───────────────────────────────────────────────
st.markdown("### Feature Importance")
st.markdown(
    '<p style="color:#94A3B8; font-size:0.85rem;">'
    "The model weighs these features most heavily when making UP/DOWN predictions.</p>",
    unsafe_allow_html=True,
)

importances = report.get("feature_importances", {})
fig = feature_importance_bar(importances)
if fig:
    st.plotly_chart(fig, use_container_width=True)
else:
    st.info("Feature importance data not available.")

st.markdown("---")

# ── Pipeline Explainer ───────────────────────────────────────────────
st.markdown("### How S.I.G.N.A.L. Works")

steps = [
    ("📡", "News Ingestion", "Real-time headlines are fetched from financial news APIs (Reuters, Bloomberg, CNBC, etc.) for tracked commodities (WTI, Brent, Natural Gas)."),
    ("🔤", "Text Preprocessing", "Raw headlines undergo NLP preprocessing: lowercasing, entity normalization (e.g. 'West Texas Intermediate' → WTI), HTML removal, and token cleaning."),
    ("📊", "Sentiment Analysis", "VADER sentiment analyzer scores each headline on a -1 to +1 scale. Compound score captures overall tone (positive = bullish signal, negative = bearish)."),
    ("🏷️", "Event Classification", "Keyword matching classifies headlines into event types: Geopolitics, Supply, Demand, Macro, Weather, Regulatory. Multiple keyword hits determine the best-fit category."),
    ("⚡", "Impact Scoring", "A composite impact score (0-100) is calculated from: sentiment magnitude (55%), relevance to commodity terms (35%), and keyword match density (10%)."),
    ("🤖", "Price Prediction", "A Random Forest classifier trained on historical sentiment + price data predicts directional movement (UP / DOWN / NEUTRAL) with a confidence score."),
    ("📈", "Signal Delivery", "Predictions, confidence scores, and risk indicators are surfaced in real-time across the S.I.G.N.A.L. dashboard for executive decision support."),
]

for icon, title, desc in steps:
    st.markdown(
        f"""
        <div class="signal-card" style="display:flex; gap:16px; align-items:start;">
            <div style="font-size:1.5rem; min-width:36px; text-align:center;">{icon}</div>
            <div>
                <div style="font-weight:700; color:#F8FAFC; font-size:0.95rem;">{title}</div>
                <div style="color:#94A3B8; font-size:0.85rem; margin-top:4px;">{desc}</div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

st.markdown("---")

# ── Model Architecture ───────────────────────────────────────────────
st.markdown("### Model Architecture")

st.markdown(
    """
    <div class="signal-card">
        <table style="width:100%; border-collapse:collapse;">
            <tr style="border-bottom:1px solid #1E293B;">
                <td style="padding:8px 0; color:#94A3B8; width:180px;">Algorithm</td>
                <td style="padding:8px 0; color:#F8FAFC; font-weight:600;">Random Forest Classifier</td>
            </tr>
            <tr style="border-bottom:1px solid #1E293B;">
                <td style="padding:8px 0; color:#94A3B8;">Estimators</td>
                <td style="padding:8px 0; color:#F8FAFC; font-weight:600;">500 trees</td>
            </tr>
            <tr style="border-bottom:1px solid #1E293B;">
                <td style="padding:8px 0; color:#94A3B8;">Class Weighting</td>
                <td style="padding:8px 0; color:#F8FAFC; font-weight:600;">{0: 1, 1: 2} (upweight minority)</td>
            </tr>
            <tr style="border-bottom:1px solid #1E293B;">
                <td style="padding:8px 0; color:#94A3B8;">Validation</td>
                <td style="padding:8px 0; color:#F8FAFC; font-weight:600;">5-fold Time Series Split</td>
            </tr>
            <tr style="border-bottom:1px solid #1E293B;">
                <td style="padding:8px 0; color:#94A3B8;">Target Horizon</td>
                <td style="padding:8px 0; color:#F8FAFC; font-weight:600;">3-period forward return &gt; 1%</td>
            </tr>
            <tr>
                <td style="padding:8px 0; color:#94A3B8;">Confidence Threshold</td>
                <td style="padding:8px 0; color:#F8FAFC; font-weight:600;">0.75 (conservative)</td>
            </tr>
        </table>
    </div>
    """,
    unsafe_allow_html=True,
)
