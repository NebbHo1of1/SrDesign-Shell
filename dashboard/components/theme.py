"""
Shell S.I.G.N.A.L. — Design System & Theme

Shell-branded color palette, CSS injection, and Plotly template for a
premium, enterprise-grade intelligence platform.
"""

import streamlit as st
import plotly.graph_objects as go
import plotly.io as pio

# ── Shell Brand Palette ───────────────────────────────────────────────
SHELL_RED = "#DD1D21"
SHELL_YELLOW = "#FBCE07"
SHELL_DARK = "#0A0E17"
SHELL_PANEL = "#111827"
SHELL_CARD = "#1A2234"
SHELL_BORDER = "#1E293B"
SHELL_TEXT = "#E2E8F0"
SHELL_MUTED = "#94A3B8"
SHELL_ACCENT = "#38BDF8"
SHELL_GREEN = "#22C55E"
SHELL_RED_SOFT = "#EF4444"
SHELL_AMBER = "#F59E0B"
SHELL_CYAN = "#06B6D4"
SHELL_PURPLE = "#A78BFA"

# Prediction colors
PRED_COLORS = {"UP": SHELL_GREEN, "DOWN": SHELL_RED_SOFT, "NEUTRAL": SHELL_AMBER}
PRED_ICONS = {"UP": "▲", "DOWN": "▼", "NEUTRAL": "●"}

# Event type colors
EVENT_COLORS = {
    "Geopolitics": "#EF4444",
    "Supply": "#F59E0B",
    "Demand": "#22C55E",
    "Macro": "#38BDF8",
    "Weather": "#06B6D4",
    "Regulatory": "#A78BFA",
    "Other": "#94A3B8",
}


def inject_shell_css():
    """Inject the full Shell S.I.G.N.A.L. CSS theme."""
    st.markdown(
        """
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        /* ── Global ──────────────────────────────── */
        .stApp {
            background: linear-gradient(180deg, #0A0E17 0%, #0F172A 100%);
            color: #E2E8F0;
            font-family: 'Inter', sans-serif;
        }

        /* ── Sidebar ─────────────────────────────── */
        section[data-testid="stSidebar"] {
            background: linear-gradient(180deg, #0D1321 0%, #111827 100%);
            border-right: 1px solid #1E293B;
        }
        section[data-testid="stSidebar"] .stSelectbox label,
        section[data-testid="stSidebar"] .stSlider label,
        section[data-testid="stSidebar"] .stMultiSelect label,
        section[data-testid="stSidebar"] .stDateInput label {
            color: #94A3B8 !important;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        /* ── Headers ─────────────────────────────── */
        h1 { color: #F8FAFC !important; font-weight: 800 !important; letter-spacing: -0.02em; }
        h2 { color: #E2E8F0 !important; font-weight: 700 !important; }
        h3 { color: #CBD5E1 !important; font-weight: 600 !important; }

        /* ── Metrics ─────────────────────────────── */
        [data-testid="stMetric"] {
            background: linear-gradient(135deg, #1A2234 0%, #1E293B 100%);
            border: 1px solid #1E293B;
            border-radius: 12px;
            padding: 16px 20px;
        }
        [data-testid="stMetricLabel"] {
            color: #94A3B8 !important;
            font-size: 0.7rem !important;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        [data-testid="stMetricValue"] {
            color: #F8FAFC !important;
            font-weight: 700 !important;
        }

        /* ── Tabs ────────────────────────────────── */
        .stTabs [data-baseweb="tab-list"] {
            gap: 0;
            background: #111827;
            border-radius: 12px;
            padding: 4px;
        }
        .stTabs [data-baseweb="tab"] {
            color: #94A3B8;
            background: transparent;
            border-radius: 8px;
            font-weight: 600;
            font-size: 0.85rem;
        }
        .stTabs [aria-selected="true"] {
            color: #F8FAFC !important;
            background: #1E293B !important;
        }

        /* ── Dataframe ───────────────────────────── */
        .stDataFrame {
            border: 1px solid #1E293B;
            border-radius: 12px;
            overflow: hidden;
        }

        /* ── Dividers ────────────────────────────── */
        hr {
            border-color: #1E293B !important;
            opacity: 0.5;
        }

        /* ── Custom Card Component ───────────────── */
        .signal-card {
            background: linear-gradient(135deg, #1A2234 0%, #1E293B 100%);
            border: 1px solid #1E293B;
            border-radius: 14px;
            padding: 20px 24px;
            margin-bottom: 12px;
        }
        .signal-card-glow {
            background: linear-gradient(135deg, #1A2234 0%, #1E293B 100%);
            border: 1px solid #38BDF8;
            border-radius: 14px;
            padding: 20px 24px;
            margin-bottom: 12px;
            box-shadow: 0 0 20px rgba(56, 189, 248, 0.08);
        }
        .signal-kpi {
            font-size: 2rem;
            font-weight: 800;
            line-height: 1.1;
        }
        .signal-label {
            font-size: 0.7rem;
            color: #94A3B8;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-weight: 600;
        }
        .signal-sublabel {
            font-size: 0.8rem;
            color: #64748B;
            margin-top: 4px;
        }

        /* ── Prediction Badge ────────────────────── */
        .pred-badge {
            display: inline-block;
            padding: 4px 14px;
            border-radius: 20px;
            font-weight: 700;
            font-size: 0.8rem;
            letter-spacing: 0.05em;
        }
        .pred-up { background: rgba(34,197,94,0.15); color: #22C55E; border: 1px solid rgba(34,197,94,0.3); }
        .pred-down { background: rgba(239,68,68,0.15); color: #EF4444; border: 1px solid rgba(239,68,68,0.3); }
        .pred-neutral { background: rgba(245,158,11,0.15); color: #F59E0B; border: 1px solid rgba(245,158,11,0.3); }

        /* ── Impact Badge ────────────────────────── */
        .impact-high { color: #EF4444; font-weight: 700; }
        .impact-med { color: #F59E0B; font-weight: 600; }
        .impact-low { color: #22C55E; font-weight: 500; }

        /* ── Status Indicator ────────────────────── */
        .status-dot {
            display: inline-block;
            width: 8px; height: 8px;
            border-radius: 50%;
            margin-right: 6px;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
        }
        .status-live { background: #22C55E; }
        .status-warning { background: #F59E0B; }
        .status-critical { background: #EF4444; }

        /* ── Header Bar ──────────────────────────── */
        .signal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #1E293B;
            margin-bottom: 24px;
        }
        .signal-logo {
            font-size: 1.4rem;
            font-weight: 800;
            letter-spacing: 0.15em;
        }

        /* ── News Row Card ───────────────────────── */
        .news-card {
            background: #1A2234;
            border: 1px solid #1E293B;
            border-radius: 10px;
            padding: 14px 18px;
            margin-bottom: 8px;
            transition: border-color 0.2s;
        }
        .news-card:hover { border-color: #38BDF8; }
        .news-title { color: #F8FAFC; font-weight: 600; font-size: 0.9rem; margin-bottom: 4px; }
        .news-meta { color: #64748B; font-size: 0.75rem; }
        .news-sentiment-bar {
            height: 4px;
            border-radius: 2px;
            margin-top: 8px;
        }

        /* ── Greeting Panel ──────────────────────── */
        .greeting-panel {
            background: linear-gradient(135deg, #0D1321 0%, #1A2234 50%, #111827 100%);
            border: 1px solid #1E293B;
            border-radius: 16px;
            padding: 28px 32px;
            margin-bottom: 24px;
            position: relative;
            overflow: hidden;
        }
        .greeting-panel::before {
            content: '';
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 3px;
            background: linear-gradient(90deg, #DD1D21 0%, #FBCE07 50%, #38BDF8 100%);
        }
        .greeting-name {
            font-size: 1.6rem;
            font-weight: 800;
            color: #F8FAFC;
        }
        .greeting-sub {
            color: #94A3B8;
            font-size: 0.85rem;
            margin-top: 4px;
        }
        .greeting-status {
            margin-top: 12px;
            font-size: 0.8rem;
        }

        /* ── Scrollbar ───────────────────────────── */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0A0E17; }
        ::-webkit-scrollbar-thumb { background: #1E293B; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #334155; }

        /* ── Hide Streamlit defaults ─────────────── */
        #MainMenu { visibility: hidden; }
        footer { visibility: hidden; }
        header[data-testid="stHeader"] { background: transparent; }
        </style>
        """,
        unsafe_allow_html=True,
    )


def get_plotly_template():
    """Return the S.I.G.N.A.L. Plotly theme."""
    return go.layout.Template(
        layout=go.Layout(
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            font=dict(family="Inter, sans-serif", color="#E2E8F0", size=12),
            title=dict(font=dict(size=16, color="#F8FAFC")),
            xaxis=dict(
                gridcolor="rgba(30,41,59,0.5)",
                zerolinecolor="#1E293B",
                tickfont=dict(color="#94A3B8"),
            ),
            yaxis=dict(
                gridcolor="rgba(30,41,59,0.5)",
                zerolinecolor="#1E293B",
                tickfont=dict(color="#94A3B8"),
            ),
            legend=dict(
                bgcolor="rgba(0,0,0,0)",
                font=dict(color="#94A3B8"),
            ),
            colorway=[
                SHELL_ACCENT, SHELL_GREEN, SHELL_RED_SOFT, SHELL_AMBER,
                SHELL_CYAN, SHELL_PURPLE, SHELL_YELLOW, SHELL_RED,
            ],
            margin=dict(l=40, r=20, t=50, b=40),
        )
    )


# Register global Plotly template
SIGNAL_TEMPLATE = get_plotly_template()
pio.templates["signal"] = SIGNAL_TEMPLATE
pio.templates.default = "signal"
