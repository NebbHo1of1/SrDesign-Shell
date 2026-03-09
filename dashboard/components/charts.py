import pandas as pd
import plotly.express as px
import plotly.graph_objects as go


def price_with_headline_markers(price_points: list[dict], headlines: list[dict], commodity: str):
    if not price_points:
        return None
    df_prices = pd.DataFrame(price_points)
    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=df_prices["timestamp"],
            y=df_prices["close"],
            mode="lines",
            name=f"{commodity} Close",
            line=dict(color="#1f77b4", width=2),
        )
    )
    if headlines:
        df_h = pd.DataFrame(headlines)
        df_h = df_h.sort_values("published_at")
        fig.add_trace(
            go.Scatter(
                x=df_h["published_at"],
                y=[df_prices["close"].mean()] * len(df_h),
                mode="markers",
                marker=dict(size=8, color=df_h["sentiment_score"], colorscale="RdYlGn"),
                text=df_h["title"],
                name="Headlines",
            )
        )
    fig.update_layout(title=f"{commodity} Price with News Markers", xaxis_title="Time", yaxis_title="Price")
    return fig


def sentiment_over_time(headlines: list[dict]):
    if not headlines:
        return None
    df = pd.DataFrame(headlines).sort_values("published_at")
    return px.line(df, x="published_at", y="sentiment_score", title="Sentiment Over Time")


def label_distribution(headlines: list[dict]):
    if not headlines:
        return None
    df = pd.DataFrame(headlines)
    count_df = df["pred_label"].value_counts().reset_index()
    count_df.columns = ["label", "count"]
    return px.bar(count_df, x="label", y="count", title="Prediction Label Distribution", color="label")


def sentiment_vs_next_move(points: list[dict]):
    if not points:
        return None
    df = pd.DataFrame(points)
    return px.scatter(
        df,
        x="sentiment_score",
        y="next_price_change",
        color="pred_label",
        title="Sentiment vs Next Price Change (%)",
    )
