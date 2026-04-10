"""
Shell S.I.G.N.A.L. — Commodity View

Price line chart with headline markers pinned to actual price levels,
latest prediction card, sentiment trend overlay, and confidence gauge.
"""

from datetime import datetime

import streamlit as st

from components.api import fetch_headlines, fetch_prices, safe_fetch
from components.charts import confidence_gauge, price_with_headline_markers, sentiment_over_time
from components.sidebar import render_sidebar
from components.theme import PRED_COLORS, PRED_ICONS, SHELL_MUTED, inject_shell_css

inject_shell_css()

st.markdown(
    """
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:4px;">
        <h1 style="margin:0;">Commodity View</h1>
    </div>
    <p style="color:#94A3B8; font-size:0.85rem; margin-top:0;">
        Price movement with news event overlay and prediction signals
    </p>
    """,
    unsafe_allow_html=True,
)

filters = st.session_state.get("filters") or render_sidebar()
since_iso = datetime.combine(filters["since_date"], datetime.min.time()).isoformat()

price_data, p_err = safe_fetch(fetch_prices, filters["commodity"], filters["range_days"])
headlines, h_err = safe_fetch(fetch_headlines, filters["commodity"], since_iso, 100)

if p_err:
    st.error(f"Price API error: {p_err}")
    st.stop()

points = price_data.get("points", []) if price_data else []
if not points:
    st.info("No price data available for this selection.")
    st.stop()

headlines = headlines or []

# ── Latest Prediction Card + Gauge ───────────────────────────────────
latest = headlines[0] if headlines else None

col_chart, col_pred = st.columns([3, 1])

with col_pred:
    if latest:
        pred = latest.get("pred_label", "—")
        conf = latest.get("pred_confidence", 0)
        pred_color = PRED_COLORS.get(pred, SHELL_MUTED)
        pred_icon = PRED_ICONS.get(pred, "●")

        st.markdown(
            f"""
            <div class="signal-card-glow" style="text-align:center;">
                <div class="signal-label">Latest Signal</div>
                <div style="font-size:2.2rem; font-weight:800; color:{pred_color}; margin:12px 0;">
                    {pred_icon} {pred}
                </div>
                <div style="font-size:0.8rem; color:#94A3B8;">
                    {latest.get('title', '')[:80]}…
                </div>
                <div style="font-size:0.7rem; color:#64748B; margin-top:8px;">
                    {latest.get('source', '')} · {latest.get('event_type', '')}
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        st.plotly_chart(confidence_gauge(conf), use_container_width=True)
    else:
        st.markdown(
            '<div class="signal-card"><div class="signal-label">No recent signals</div></div>',
            unsafe_allow_html=True,
        )

# ── Price Chart ──────────────────────────────────────────────────────
with col_chart:
    fig = price_with_headline_markers(points, headlines, filters["commodity"])
    if fig:
        st.plotly_chart(fig, use_container_width=True)

# ── Sentiment Trend ──────────────────────────────────────────────────
st.markdown("### Sentiment Trend")
sent_fig = sentiment_over_time(headlines)
if sent_fig:
    st.plotly_chart(sent_fig, use_container_width=True)
else:
    st.info("No sentiment data to display.")
