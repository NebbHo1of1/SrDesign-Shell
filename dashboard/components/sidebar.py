"""
Shell S.I.G.N.A.L. — Sidebar

Premium Shell-branded sidebar with role display, filters, and system status.
"""

from datetime import date, timedelta

import streamlit as st

DEFAULT_COMMODITIES = ["WTI", "BRENT", "NATGAS"]
EVENT_TYPES = ["All", "Geopolitics", "Supply", "Demand", "Macro", "Weather", "Regulatory", "Other"]

# ── Role Simulation (in production this comes from auth) ──────────────
ROLES = {
    "Executive": {"icon": "👔", "level": "Full Access"},
    "Analyst": {"icon": "📊", "level": "Detailed View"},
    "Viewer": {"icon": "👁️", "level": "Read Only"},
}


def render_sidebar() -> dict:
    """Render the Shell S.I.G.N.A.L. sidebar and return the active filter dict."""

    # ── Branding ─────────────────────────────────────────────────────
    st.sidebar.markdown(
        """
        <div style="text-align:center; padding: 12px 0 8px 0;">
            <div style="font-size:1.3rem; font-weight:800; letter-spacing:0.2em; color:#FBCE07;">
                S.I.G.N.A.L.
            </div>
            <div style="font-size:0.6rem; color:#64748B; letter-spacing:0.12em; margin-top:2px;">
                SHELL INTELLIGENCE &amp; GLOBAL NEWS ANALYTICS LAYER
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    st.sidebar.divider()

    # ── Role Selector ────────────────────────────────────────────────
    role = st.sidebar.selectbox("Role", list(ROLES.keys()), index=0)
    role_info = ROLES[role]
    st.sidebar.markdown(
        f"""<div style="font-size:0.75rem; color:#94A3B8; margin-top:-8px;">
        {role_info['icon']} {role_info['level']}</div>""",
        unsafe_allow_html=True,
    )
    st.sidebar.divider()

    # ── Filters ──────────────────────────────────────────────────────
    st.sidebar.markdown(
        '<div style="font-size:0.7rem; color:#64748B; letter-spacing:0.1em; '
        'font-weight:700; margin-bottom:8px;">FILTERS</div>',
        unsafe_allow_html=True,
    )

    commodity = st.sidebar.selectbox("Commodity", DEFAULT_COMMODITIES, index=0)
    range_days = st.sidebar.selectbox("Time Window", [7, 14, 30], index=0, format_func=lambda d: f"{d} Days")
    event_type = st.sidebar.selectbox("Event Type", EVENT_TYPES, index=0)

    min_confidence = st.sidebar.slider(
        "Min Confidence", min_value=0.0, max_value=1.0, value=0.50, step=0.05, format="%.0f%%"
    )
    sentiment_filter = st.sidebar.multiselect(
        "Sentiment Bands",
        ["Negative", "Neutral", "Positive"],
        default=["Negative", "Neutral", "Positive"],
    )

    today = date.today()
    since_date = st.sidebar.date_input(
        "Since Date", value=today - timedelta(days=range_days), max_value=today
    )

    # ── System Status ────────────────────────────────────────────────
    st.sidebar.divider()
    st.sidebar.markdown(
        """
        <div style="font-size:0.7rem; color:#64748B; letter-spacing:0.1em;
        font-weight:700; margin-bottom:8px;">SYSTEM STATUS</div>
        <div style="font-size:0.8rem; color:#94A3B8;">
            <span style="display:inline-block;width:8px;height:8px;
            border-radius:50%;background:#22C55E;margin-right:6px;"></span>
            API Online
        </div>
        <div style="font-size:0.8rem; color:#94A3B8; margin-top:4px;">
            <span style="display:inline-block;width:8px;height:8px;
            border-radius:50%;background:#22C55E;margin-right:6px;"></span>
            Model Active
        </div>
        <div style="font-size:0.8rem; color:#94A3B8; margin-top:4px;">
            <span style="display:inline-block;width:8px;height:8px;
            border-radius:50%;background:#22C55E;margin-right:6px;"></span>
            News Feed Live
        </div>
        """,
        unsafe_allow_html=True,
    )

    # ── Footer ───────────────────────────────────────────────────────
    st.sidebar.markdown(
        """
        <div style="text-align:center; margin-top:24px; padding-top:12px;
        border-top:1px solid #1E293B;">
            <div style="font-size:0.6rem; color:#475569; letter-spacing:0.05em;">
                Shell S.I.G.N.A.L. v2.0<br>Commodity Intelligence Platform
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    return {
        "commodity": commodity,
        "range_days": range_days,
        "min_confidence": min_confidence,
        "sentiment_filter": sentiment_filter,
        "since_date": since_date,
        "event_type": event_type,
        "role": role,
    }
