"""
Shell S.I.G.N.A.L. — Signal Engine

Alert feed, risk meter, market status board, volatility tracking,
and cross-commodity signal comparison.
"""

from datetime import datetime

import pandas as pd
import streamlit as st

from components.api import fetch_headlines, fetch_kpis, safe_fetch, default_since_iso
from components.charts import risk_meter
from components.sidebar import render_sidebar
from components.theme import (
    PRED_COLORS,
    PRED_ICONS,
    SHELL_AMBER,
    SHELL_GREEN,
    SHELL_MUTED,
    SHELL_RED_SOFT,
    inject_shell_css,
)

inject_shell_css()

st.markdown(
    """
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:4px;">
        <h1 style="margin:0;">Signal Engine</h1>
        <span class="pred-badge pred-neutral" style="font-size:0.7rem;">MONITORING</span>
    </div>
    <p style="color:#94A3B8; font-size:0.85rem; margin-top:0;">
        Real-time risk monitoring, alert feed, and cross-commodity signal comparison
    </p>
    """,
    unsafe_allow_html=True,
)

filters = st.session_state.get("filters") or render_sidebar()

# ── Market Status Board ──────────────────────────────────────────────
st.markdown("### Market Status Board")

commodities = ["WTI", "BRENT", "NATGAS"]
cols = st.columns(len(commodities))

all_kpis = {}
for i, c in enumerate(commodities):
    kpis, err = safe_fetch(fetch_kpis, c)
    all_kpis[c] = kpis
    with cols[i]:
        if err or not kpis:
            st.markdown(
                f'<div class="signal-card"><div class="signal-label">{c}</div>'
                f'<div style="color:#64748B;">Unavailable</div></div>',
                unsafe_allow_html=True,
            )
            continue

        pred = kpis.get("last_prediction", "—")
        conf = kpis.get("last_confidence", 0) or 0
        avg_sent = kpis.get("avg_sentiment_24h", 0)
        pred_color = PRED_COLORS.get(pred, SHELL_MUTED)
        pred_icon = PRED_ICONS.get(pred, "●")

        # Status indicator
        if abs(avg_sent) > 0.3 or kpis.get("high_impact_count_24h", 0) > 3:
            status = ("ELEVATED", "status-warning", SHELL_AMBER)
        elif abs(avg_sent) > 0.5 or kpis.get("high_impact_count_24h", 0) > 5:
            status = ("CRITICAL", "status-critical", SHELL_RED_SOFT)
        else:
            status = ("STABLE", "status-live", SHELL_GREEN)

        st.markdown(
            f"""
            <div class="signal-card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div class="signal-label">{c}</div>
                    <div style="font-size:0.7rem;">
                        <span class="status-dot {status[1]}"></span>
                        <span style="color:{status[2]}; font-weight:600;">{status[0]}</span>
                    </div>
                </div>
                <div style="font-size:1.8rem; font-weight:800; color:{pred_color}; margin:8px 0;">
                    {pred_icon} {pred}
                </div>
                <div style="display:flex; gap:16px;">
                    <div>
                        <div class="signal-label">Confidence</div>
                        <div style="color:#F8FAFC; font-weight:700;">{conf:.0%}</div>
                    </div>
                    <div>
                        <div class="signal-label">Sentiment</div>
                        <div style="color:{'#22C55E' if avg_sent > 0 else '#EF4444' if avg_sent < 0 else '#94A3B8'};
                              font-weight:700;">{avg_sent:+.3f}</div>
                    </div>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

st.markdown("---")

# ── Risk Meter ───────────────────────────────────────────────────────
st.markdown("### Risk Assessment")

active_commodity = filters["commodity"]
active_kpis = all_kpis.get(active_commodity)

if active_kpis:
    r_col1, r_col2 = st.columns([1, 2])
    with r_col1:
        risk_fig = risk_meter(
            active_kpis.get("avg_sentiment_24h", 0),
            active_kpis.get("high_impact_count_24h", 0),
        )
        st.plotly_chart(risk_fig, use_container_width=True)

    with r_col2:
        avg_s = active_kpis.get("avg_sentiment_24h", 0)
        hi = active_kpis.get("high_impact_count_24h", 0)
        total = active_kpis.get("total_headlines_24h", 0)

        st.markdown(
            f"""
            <div class="signal-card">
                <div class="signal-label">{active_commodity} — 24h Risk Factors</div>
                <table style="width:100%; margin-top:12px; border-collapse:collapse;">
                    <tr style="border-bottom:1px solid #1E293B;">
                        <td style="padding:10px 0; color:#94A3B8;">Avg Sentiment (24h)</td>
                        <td style="padding:10px 0; color:{'#22C55E' if avg_s > 0 else '#EF4444' if avg_s < 0 else '#94A3B8'};
                            font-weight:700; text-align:right;">{avg_s:+.3f}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #1E293B;">
                        <td style="padding:10px 0; color:#94A3B8;">High-Impact Headlines</td>
                        <td style="padding:10px 0; color:{'#EF4444' if hi > 0 else '#64748B'};
                            font-weight:700; text-align:right;">{hi}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #1E293B;">
                        <td style="padding:10px 0; color:#94A3B8;">Total Headlines</td>
                        <td style="padding:10px 0; color:#F8FAFC; font-weight:700; text-align:right;">{total}</td>
                    </tr>
                    <tr>
                        <td style="padding:10px 0; color:#94A3B8;">Signal</td>
                        <td style="padding:10px 0; text-align:right;">
                            <span class="pred-badge pred-{active_kpis.get('last_prediction', 'neutral').lower()}">
                                {active_kpis.get('last_prediction', '—')}
                            </span>
                        </td>
                    </tr>
                </table>
            </div>
            """,
            unsafe_allow_html=True,
        )
else:
    st.info("KPI data not available for risk assessment.")

st.markdown("---")

# ── Alert Feed ───────────────────────────────────────────────────────
st.markdown("### Alert Feed — High Impact Events")

since_iso = default_since_iso(days=filters["range_days"])
headlines, err = safe_fetch(fetch_headlines, filters["commodity"], since_iso, 200)

if err:
    st.warning(f"Could not load alerts: {err}")
elif headlines:
    df = pd.DataFrame(headlines)
    alerts = df[df["impact_score"] >= 65].sort_values("impact_score", ascending=False).head(15)

    if alerts.empty:
        st.info("No high-impact alerts in this time window.")
    else:
        for _, row in alerts.iterrows():
            pred = row.get("pred_label", "—")
            pred_color = PRED_COLORS.get(pred, SHELL_MUTED)
            pred_icon = PRED_ICONS.get(pred, "●")
            impact = row.get("impact_score", 0)
            sentiment = row.get("sentiment_score", 0)

            alert_border = "#EF4444" if impact >= 80 else "#F59E0B" if impact >= 65 else "#1E293B"
            alert_icon = "🔴" if impact >= 80 else "🟡"

            st.markdown(
                f"""
                <div class="news-card" style="border-color:{alert_border};">
                    <div style="display:flex; justify-content:space-between; align-items:start;">
                        <div style="flex:1;">
                            <div class="news-title">{alert_icon} {row.get('title', '')}</div>
                            <div class="news-meta">
                                {row.get('source', '')} · {row.get('event_type', '')} ·
                                Impact <b>{impact:.0f}</b> · Sentiment {sentiment:+.2f}
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <span class="pred-badge pred-{pred.lower()}">{pred_icon} {pred}</span>
                        </div>
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )
else:
    st.info("No headlines available for alert feed.")

# ── Timestamp ────────────────────────────────────────────────────────
st.markdown("---")
st.markdown(
    f"""
    <div style="text-align:center; color:#475569; font-size:0.75rem;">
        Last refreshed: {datetime.utcnow().strftime("%d %b %Y  %H:%M:%S UTC")}
    </div>
    """,
    unsafe_allow_html=True,
)
