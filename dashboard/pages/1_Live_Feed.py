"""
Shell S.I.G.N.A.L. — Live Intelligence Feed

Color-coded headline cards with prediction badges, sentiment bars,
impact scores, and advanced filters. No debug code.
"""

from datetime import datetime

import pandas as pd
import streamlit as st

from components.api import fetch_headlines, safe_fetch
from components.sidebar import render_sidebar
from components.theme import (
    PRED_COLORS,
    PRED_ICONS,
    SHELL_GREEN,
    SHELL_MUTED,
    SHELL_RED_SOFT,
    inject_shell_css,
)

inject_shell_css()

st.markdown(
    """
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:4px;">
        <h1 style="margin:0;">Intelligence Feed</h1>
        <span class="pred-badge pred-neutral" style="font-size:0.7rem;">LIVE</span>
    </div>
    <p style="color:#94A3B8; font-size:0.85rem; margin-top:0;">
        Real-time news monitoring with AI-powered prediction signals
    </p>
    """,
    unsafe_allow_html=True,
)

filters = st.session_state.get("filters") or render_sidebar()
since_iso = datetime.combine(filters["since_date"], datetime.min.time()).isoformat()

headlines, err = safe_fetch(fetch_headlines, filters["commodity"], since_iso)

if err:
    st.error(f"API unavailable: {err}")
    st.stop()

if not headlines:
    st.info("No headlines found. Adjust filters or seed the database.")
    st.stop()

df = pd.DataFrame(headlines)

# ── Apply Filters ────────────────────────────────────────────────────
if "sentiment_score" in df.columns and filters["sentiment_filter"]:
    mask = pd.Series([False] * len(df), index=df.index)
    if "Negative" in filters["sentiment_filter"]:
        mask |= df["sentiment_score"].fillna(0) < -0.15
    if "Neutral" in filters["sentiment_filter"]:
        mask |= (df["sentiment_score"].fillna(0) >= -0.15) & (df["sentiment_score"].fillna(0) <= 0.15)
    if "Positive" in filters["sentiment_filter"]:
        mask |= df["sentiment_score"].fillna(0) > 0.15
    df = df[mask]

if "pred_confidence" in df.columns:
    df = df[df["pred_confidence"].fillna(0.5) >= filters["min_confidence"]]

if filters.get("event_type", "All") != "All" and "event_type" in df.columns:
    df = df[df["event_type"] == filters["event_type"]]

df = df.sort_values("published_at", ascending=False)

if df.empty:
    st.info("All headlines filtered out. Relax your filters to see results.")
    st.stop()

# ── Summary Bar ──────────────────────────────────────────────────────
total = len(df)
up_count = len(df[df["pred_label"] == "UP"])
down_count = len(df[df["pred_label"] == "DOWN"])
neutral_count = total - up_count - down_count
avg_impact = df["impact_score"].mean() if "impact_score" in df.columns else 0

c1, c2, c3, c4, c5 = st.columns(5)
c1.metric("Total", total)
c2.metric("▲ UP", up_count)
c3.metric("▼ DOWN", down_count)
c4.metric("● NEUTRAL", neutral_count)
c5.metric("Avg Impact", f"{avg_impact:.0f}")

st.markdown("---")

# ── Headline Cards ───────────────────────────────────────────────────
for _, row in df.iterrows():
    pred = row.get("pred_label", "—")
    pred_color = PRED_COLORS.get(pred, SHELL_MUTED)
    pred_icon = PRED_ICONS.get(pred, "●")
    sentiment = row.get("sentiment_score", 0)
    impact = row.get("impact_score", 0)
    conf = row.get("pred_confidence", 0)

    bar_pct = int(max(5, min(100, (sentiment + 1) / 2 * 100)))
    bar_color = SHELL_GREEN if sentiment > 0.15 else SHELL_RED_SOFT if sentiment < -0.15 else SHELL_MUTED
    impact_class = "impact-high" if impact >= 70 else "impact-med" if impact >= 40 else "impact-low"

    pub = row.get("published_at", "")
    url = row.get("url", "")
    title_link = f'<a href="{url}" target="_blank" style="color:#F8FAFC; text-decoration:none;">{row.get("title", "")}</a>' if url else row.get("title", "")

    st.markdown(
        f"""
        <div class="news-card">
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <div style="flex:1; margin-right:16px;">
                    <div class="news-title">{title_link}</div>
                    <div class="news-meta">
                        {row.get('source', '')} · {row.get('event_type', '')} ·
                        <span class="{impact_class}">Impact {impact:.0f}</span> ·
                        Sentiment {sentiment:+.2f} ·
                        {str(pub)[:16]}
                    </div>
                </div>
                <div style="text-align:right; min-width:90px;">
                    <span class="pred-badge pred-{pred.lower()}">{pred_icon} {pred}</span>
                    <div style="font-size:0.75rem; color:#64748B; margin-top:4px;">
                        Confidence {conf:.0%}
                    </div>
                </div>
            </div>
            <div class="news-sentiment-bar" style="background: linear-gradient(90deg,
                {bar_color} {bar_pct}%, #1E293B {bar_pct}%);"></div>
        </div>
        """,
        unsafe_allow_html=True,
    )
