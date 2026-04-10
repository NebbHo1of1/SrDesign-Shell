"""
Shell S.I.G.N.A.L. — Command Center

The main landing page: JARVIS-style greeting, multi-commodity KPI cards,
market pulse, executive summary, and system status.
"""

from datetime import datetime

import streamlit as st

from components.theme import (
    PRED_COLORS,
    PRED_ICONS,
    SHELL_GREEN,
    SHELL_MUTED,
    SHELL_RED_SOFT,
    inject_shell_css,
)
from components.sidebar import render_sidebar
from components.api import fetch_kpis, fetch_headlines, safe_fetch, default_since_iso

# ── Page Config ──────────────────────────────────────────────────────
st.set_page_config(
    page_title="Shell S.I.G.N.A.L.",
    page_icon="🛢️",
    layout="wide",
    initial_sidebar_state="expanded",
)
inject_shell_css()

filters = render_sidebar()
st.session_state["filters"] = filters

# ── Greeting Panel ───────────────────────────────────────────────────
now = datetime.utcnow()
hour = now.hour
greeting_word = "Good morning" if hour < 12 else "Good afternoon" if hour < 18 else "Good evening"
role = filters.get("role", "Executive")
user_name = "Operator"  # In production: from auth token

st.markdown(
    f"""
    <div class="greeting-panel">
        <div class="greeting-name">{greeting_word}, {user_name}.</div>
        <div class="greeting-sub">
            Shell Intelligence & Global News Analytics Layer — {role} View
        </div>
        <div class="greeting-status">
            <span class="status-dot status-live"></span>
            <span style="color:#22C55E; font-weight:600;">SYSTEMS ONLINE</span>
            <span style="color:#64748B; margin-left:12px;">
                {now.strftime("%d %b %Y  •  %H:%M UTC")}
            </span>
        </div>
    </div>
    """,
    unsafe_allow_html=True,
)

# ── Multi-Commodity KPI Row ──────────────────────────────────────────
st.markdown("### Market Overview")

commodities = ["WTI", "BRENT", "NATGAS"]
cols = st.columns(len(commodities))

for i, c in enumerate(commodities):
    kpis, err = safe_fetch(fetch_kpis, c)
    with cols[i]:
        if err:
            st.markdown(
                f"""<div class="signal-card">
                <div class="signal-label">{c}</div>
                <div style="color:#64748B; font-size:0.85rem; margin-top:8px;">
                    Unavailable — {err}</div>
                </div>""",
                unsafe_allow_html=True,
            )
            continue

        pred = kpis.get("last_prediction", "—")
        conf = kpis.get("last_confidence")
        avg_sent = kpis.get("avg_sentiment_24h", 0)
        headline_count = kpis.get("total_headlines_24h", 0)
        high_impact = kpis.get("high_impact_count_24h", 0)

        pred_color = PRED_COLORS.get(pred, SHELL_MUTED)
        pred_icon = PRED_ICONS.get(pred, "●")
        conf_str = f"{conf:.0%}" if conf else "—"

        sent_color = SHELL_GREEN if avg_sent > 0.1 else SHELL_RED_SOFT if avg_sent < -0.1 else SHELL_MUTED

        glow = "signal-card-glow" if pred in ("UP", "DOWN") else "signal-card"

        st.markdown(
            f"""
            <div class="{glow}">
                <div class="signal-label">{c}</div>
                <div style="display:flex; align-items:baseline; gap:10px; margin-top:8px;">
                    <span class="signal-kpi" style="color:{pred_color};">{pred_icon} {pred}</span>
                    <span style="font-size:1.1rem; color:{pred_color}; font-weight:600;">{conf_str}</span>
                </div>
                <div style="display:flex; gap:20px; margin-top:12px;">
                    <div>
                        <div class="signal-label">Sentiment</div>
                        <div style="color:{sent_color}; font-weight:700; font-size:1rem;">
                            {avg_sent:+.3f}
                        </div>
                    </div>
                    <div>
                        <div class="signal-label">Headlines</div>
                        <div style="color:#F8FAFC; font-weight:700; font-size:1rem;">
                            {headline_count}
                        </div>
                    </div>
                    <div>
                        <div class="signal-label">High Impact</div>
                        <div style="color:{'#EF4444' if high_impact > 0 else '#64748B'};
                              font-weight:700; font-size:1rem;">
                            {high_impact}
                        </div>
                    </div>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

# ── Latest Headlines ─────────────────────────────────────────────────
st.markdown("### Intelligence Feed — Latest")

since_iso = default_since_iso(days=filters["range_days"])
headlines, err = safe_fetch(fetch_headlines, filters["commodity"], since_iso, 10)

if err:
    st.warning(f"Could not load headlines: {err}")
elif not headlines:
    st.info("No recent headlines. Seed the database: `POST /seed`")
else:
    for h in headlines[:8]:
        pred = h.get("pred_label", "—")
        pred_color = PRED_COLORS.get(pred, SHELL_MUTED)
        pred_icon = PRED_ICONS.get(pred, "●")
        sentiment = h.get("sentiment_score", 0)
        impact = h.get("impact_score", 0)

        # Sentiment bar width/color
        bar_pct = int(max(5, min(100, (sentiment + 1) / 2 * 100)))
        bar_color = SHELL_GREEN if sentiment > 0.15 else SHELL_RED_SOFT if sentiment < -0.15 else SHELL_MUTED

        impact_class = "impact-high" if impact >= 70 else "impact-med" if impact >= 40 else "impact-low"

        st.markdown(
            f"""
            <div class="news-card">
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <div>
                        <div class="news-title">{h.get('title', '')}</div>
                        <div class="news-meta">
                            {h.get('source', '')} · {h.get('event_type', '')} ·
                            <span class="{impact_class}">Impact {impact:.0f}</span>
                        </div>
                    </div>
                    <div style="text-align:right; min-width:80px;">
                        <span class="pred-badge pred-{pred.lower()}">{pred_icon} {pred}</span>
                        <div style="font-size:0.7rem; color:#64748B; margin-top:4px;">
                            {h.get('pred_confidence', 0):.0%}
                        </div>
                    </div>
                </div>
                <div class="news-sentiment-bar" style="background: linear-gradient(90deg,
                    {bar_color} {bar_pct}%, #1E293B {bar_pct}%);"></div>
            </div>
            """,
            unsafe_allow_html=True,
        )

# ── Navigation Hint ──────────────────────────────────────────────────
st.markdown("---")
st.markdown(
    """
    <div style="text-align:center; color:#64748B; font-size:0.8rem;">
        Navigate using the sidebar → <b>Live Feed</b> · <b>Commodity View</b> ·
        <b>Analytics</b> · <b>AI Model</b> · <b>Signal Engine</b>
    </div>
    """,
    unsafe_allow_html=True,
)
