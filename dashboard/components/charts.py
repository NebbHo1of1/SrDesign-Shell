"""
Shell S.I.G.N.A.L. — Chart Library

Every chart uses the global S.I.G.N.A.L. Plotly template (set in theme.py).
Charts are pure functions that return go.Figure objects.
"""

import pandas as pd
import plotly.graph_objects as go

from .theme import (
    EVENT_COLORS,
    PRED_COLORS,
    SHELL_ACCENT,
    SHELL_AMBER,
    SHELL_CYAN,
    SHELL_GREEN,
    SHELL_MUTED,
    SHELL_RED_SOFT,
    SHELL_TEXT,
)

# ─── Price + Headline Markers ─────────────────────────────────────────


def price_with_headline_markers(
    price_points: list[dict],
    headlines: list[dict],
    commodity: str,
) -> go.Figure | None:
    """Line chart of commodity price with news event markers pinned to the
    actual nearest price (not the mean)."""
    if not price_points:
        return None

    df_p = pd.DataFrame(price_points)
    df_p["timestamp"] = pd.to_datetime(df_p["timestamp"])
    df_p = df_p.sort_values("timestamp")

    fig = go.Figure()

    # Area fill under the price line
    fig.add_trace(
        go.Scatter(
            x=df_p["timestamp"],
            y=df_p["close"],
            mode="lines",
            name=f"{commodity} Price",
            line=dict(color=SHELL_ACCENT, width=2.5),
            fill="tozeroy",
            fillcolor="rgba(56,189,248,0.06)",
        )
    )

    # Headline markers at correct price level
    if headlines:
        df_h = pd.DataFrame(headlines)
        df_h["published_at"] = pd.to_datetime(df_h["published_at"])
        df_h = df_h.sort_values("published_at")

        # Find closest price for each headline
        marker_y = []
        for _, row in df_h.iterrows():
            idx = (df_p["timestamp"] - row["published_at"]).abs().idxmin()
            marker_y.append(df_p.loc[idx, "close"])

        colors = [
            SHELL_GREEN if s > 0.15 else SHELL_RED_SOFT if s < -0.15 else SHELL_AMBER
            for s in df_h["sentiment_score"]
        ]

        fig.add_trace(
            go.Scatter(
                x=df_h["published_at"],
                y=marker_y,
                mode="markers",
                name="News Events",
                marker=dict(size=9, color=colors, line=dict(width=1, color="#0A0E17")),
                text=df_h["title"],
                hovertemplate="<b>%{text}</b><br>Price: $%{y:.2f}<extra></extra>",
            )
        )

    fig.update_layout(
        title=dict(text=f"{commodity} — Price & News Events"),
        xaxis_title="",
        yaxis_title="USD",
        height=420,
        hovermode="x unified",
    )
    return fig


# ─── Sentiment Over Time ─────────────────────────────────────────────


def sentiment_over_time(headlines: list[dict]) -> go.Figure | None:
    if not headlines:
        return None

    df = pd.DataFrame(headlines)
    df["published_at"] = pd.to_datetime(df["published_at"])
    df = df.sort_values("published_at")

    # Rolling 5-headline moving average for smoothing
    df["sentiment_ma"] = df["sentiment_score"].rolling(5, min_periods=1).mean()

    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=df["published_at"],
            y=df["sentiment_score"],
            mode="markers",
            name="Raw Score",
            marker=dict(size=5, color=SHELL_MUTED, opacity=0.4),
        )
    )
    fig.add_trace(
        go.Scatter(
            x=df["published_at"],
            y=df["sentiment_ma"],
            mode="lines",
            name="5-headline MA",
            line=dict(color=SHELL_CYAN, width=2.5),
        )
    )
    # Zero line
    fig.add_hline(y=0, line_dash="dot", line_color="#334155", annotation_text="Neutral")

    fig.update_layout(
        title="Sentiment Trend",
        xaxis_title="",
        yaxis_title="Score",
        height=320,
        hovermode="x unified",
    )
    return fig


# ─── Prediction Label Distribution ───────────────────────────────────


def label_distribution(headlines: list[dict]) -> go.Figure | None:
    if not headlines:
        return None

    df = pd.DataFrame(headlines)
    counts = df["pred_label"].value_counts().reindex(["UP", "DOWN", "NEUTRAL"]).fillna(0)

    fig = go.Figure(
        go.Bar(
            x=counts.index,
            y=counts.values,
            marker_color=[PRED_COLORS.get(l, SHELL_MUTED) for l in counts.index],
            text=counts.values.astype(int),
            textposition="outside",
        )
    )
    fig.update_layout(
        title="Prediction Distribution",
        xaxis_title="",
        yaxis_title="Count",
        height=340,
        showlegend=False,
    )
    return fig


# ─── Sentiment vs Price Change Scatter ────────────────────────────────


def sentiment_vs_next_move(points: list[dict]) -> go.Figure | None:
    if not points:
        return None

    df = pd.DataFrame(points)
    color_map = {"UP": SHELL_GREEN, "DOWN": SHELL_RED_SOFT, "NEUTRAL": SHELL_AMBER}

    fig = go.Figure()
    for label, color in color_map.items():
        subset = df[df["pred_label"] == label]
        if subset.empty:
            continue
        fig.add_trace(
            go.Scatter(
                x=subset["sentiment_score"],
                y=subset["next_price_change"],
                mode="markers",
                name=label,
                marker=dict(size=7, color=color, opacity=0.7),
                hovertemplate="Sentiment: %{x:.2f}<br>Δ Price: %{y:.2f}%<extra></extra>",
            )
        )

    fig.add_hline(y=0, line_dash="dot", line_color="#334155")
    fig.add_vline(x=0, line_dash="dot", line_color="#334155")

    fig.update_layout(
        title="Sentiment vs Next Price Change",
        xaxis_title="Sentiment Score",
        yaxis_title="Price Change %",
        height=400,
    )
    return fig


# ─── Event Type Donut ─────────────────────────────────────────────────


def event_type_donut(headlines: list[dict]) -> go.Figure | None:
    if not headlines:
        return None

    df = pd.DataFrame(headlines)
    counts = df["event_type"].value_counts()
    colors = [EVENT_COLORS.get(e, SHELL_MUTED) for e in counts.index]

    fig = go.Figure(
        go.Pie(
            labels=counts.index,
            values=counts.values,
            hole=0.6,
            marker=dict(colors=colors, line=dict(color="#0A0E17", width=2)),
            textinfo="label+percent",
            textfont=dict(size=11),
        )
    )
    fig.update_layout(
        title="Event Type Breakdown",
        height=380,
        showlegend=False,
        annotations=[
            dict(text="Events", x=0.5, y=0.5, font_size=14, font_color=SHELL_MUTED, showarrow=False)
        ],
    )
    return fig


# ─── Feature Importance Bar ──────────────────────────────────────────


def feature_importance_bar(importances: dict) -> go.Figure | None:
    if not importances:
        return None

    sorted_items = sorted(importances.items(), key=lambda x: x[1], reverse=True)
    names = [i[0] for i in sorted_items]
    vals = [i[1] for i in sorted_items]

    fig = go.Figure(
        go.Bar(
            x=vals,
            y=names,
            orientation="h",
            marker_color=SHELL_ACCENT,
            text=[f"{v:.1%}" for v in vals],
            textposition="outside",
        )
    )
    fig.update_layout(
        title="Feature Importance",
        xaxis_title="Importance",
        yaxis_title="",
        height=max(260, len(names) * 45),
        yaxis=dict(autorange="reversed"),
    )
    return fig


# ─── Confidence Gauge ─────────────────────────────────────────────────


def confidence_gauge(value: float, label: str = "Confidence") -> go.Figure:
    color = SHELL_GREEN if value >= 0.75 else SHELL_AMBER if value >= 0.55 else SHELL_RED_SOFT

    fig = go.Figure(
        go.Indicator(
            mode="gauge+number",
            value=value * 100,
            number=dict(suffix="%", font=dict(size=28, color=SHELL_TEXT)),
            gauge=dict(
                axis=dict(range=[0, 100], tickfont=dict(color=SHELL_MUTED, size=10)),
                bar=dict(color=color),
                bgcolor="#1A2234",
                borderwidth=0,
                steps=[
                    dict(range=[0, 55], color="rgba(239,68,68,0.1)"),
                    dict(range=[55, 75], color="rgba(245,158,11,0.1)"),
                    dict(range=[75, 100], color="rgba(34,197,94,0.1)"),
                ],
            ),
            title=dict(text=label, font=dict(size=12, color=SHELL_MUTED)),
        )
    )
    fig.update_layout(height=200, margin=dict(l=20, r=20, t=40, b=10))
    return fig


# ─── Impact Timeline ─────────────────────────────────────────────────


def impact_timeline(headlines: list[dict], min_impact: float = 70) -> go.Figure | None:
    if not headlines:
        return None

    df = pd.DataFrame(headlines)
    df = df[df["impact_score"] >= min_impact].sort_values("published_at", ascending=False).head(20)
    if df.empty:
        return None

    df["published_at"] = pd.to_datetime(df["published_at"])
    colors = [PRED_COLORS.get(l, SHELL_MUTED) for l in df["pred_label"]]

    fig = go.Figure(
        go.Scatter(
            x=df["published_at"],
            y=df["impact_score"],
            mode="markers+text",
            marker=dict(size=df["impact_score"] / 6, color=colors, opacity=0.8),
            text=df["event_type"],
            textposition="top center",
            textfont=dict(size=9, color=SHELL_MUTED),
            hovertemplate="<b>%{customdata}</b><br>Impact: %{y:.0f}<extra></extra>",
            customdata=df["title"],
        )
    )
    fig.update_layout(
        title="High-Impact Events Timeline",
        xaxis_title="",
        yaxis_title="Impact Score",
        height=340,
    )
    return fig


# ─── Risk Meter ──────────────────────────────────────────────────────


def risk_meter(avg_sentiment: float, high_impact_count: int) -> go.Figure:
    """Composite risk score: negative sentiment + high-impact count = higher risk."""
    sentiment_risk = max(0, -avg_sentiment) * 50  # 0-50
    impact_risk = min(50, high_impact_count * 10)  # 0-50
    risk = min(100, sentiment_risk + impact_risk)

    color = SHELL_RED_SOFT if risk >= 60 else SHELL_AMBER if risk >= 30 else SHELL_GREEN

    fig = go.Figure(
        go.Indicator(
            mode="gauge+number",
            value=risk,
            number=dict(font=dict(size=32, color=color)),
            gauge=dict(
                axis=dict(range=[0, 100], tickfont=dict(color=SHELL_MUTED, size=10)),
                bar=dict(color=color),
                bgcolor="#1A2234",
                borderwidth=0,
                steps=[
                    dict(range=[0, 30], color="rgba(34,197,94,0.08)"),
                    dict(range=[30, 60], color="rgba(245,158,11,0.08)"),
                    dict(range=[60, 100], color="rgba(239,68,68,0.08)"),
                ],
                threshold=dict(line=dict(color="#F8FAFC", width=2), thickness=0.8, value=risk),
            ),
            title=dict(text="Risk Level", font=dict(size=12, color=SHELL_MUTED)),
        )
    )
    fig.update_layout(height=220, margin=dict(l=20, r=20, t=40, b=10))
    return fig
