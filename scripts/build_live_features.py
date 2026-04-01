import os
import pandas as pd
import requests
import yfinance as yf
from dotenv import load_dotenv
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

load_dotenv()

NEWS_API_KEY = os.getenv("NEWS_API_KEY")
if not NEWS_API_KEY:
    raise ValueError("NEWS_API_KEY is missing in .env")

FEATURE_COLUMNS = [
    "article_count",
    "avg_tone",
    "price",
    "price_lag_1",
    "price_lag_2",
    "price_change_1",
    "return_1",
    "price_ma_3",
    "price_ma_5",
    "volatility_5"
]

NEWS_URL = "https://newsapi.org/v2/everything"
QUERY = '"oil" OR "crude" OR "WTI" OR "Brent" OR "OPEC" OR "refinery" OR "pipeline"'

analyzer = SentimentIntensityAnalyzer()


def fetch_newsapi_articles():
    params = {
        "q": QUERY,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": 50
    }
    headers = {
        "X-Api-Key": NEWS_API_KEY
    }

    response = requests.get(NEWS_URL, params=params, headers=headers, timeout=30)
    response.raise_for_status()
    data = response.json()

    if data.get("status") != "ok":
        raise ValueError(f"NewsAPI error: {data}")

    return data.get("articles", [])


def build_news_features(articles):
    if not articles:
        return {
            "article_count": 0,
            "avg_tone": 0.0
        }

    scores = []
    for article in articles:
        title = article.get("title") or ""
        description = article.get("description") or ""
        text = f"{title}. {description}".strip()
        score = analyzer.polarity_scores(text)["compound"]
        scores.append(score)

    return {
        "article_count": len(articles),
        "avg_tone": float(sum(scores) / len(scores))
    }


def fetch_wti_history():
    # CL=F is Yahoo Finance's WTI crude futures ticker
    df = yf.download("CL=F", period="15d", interval="1d", auto_adjust=False, progress=False)

    if df.empty:
        raise ValueError("No WTI data returned from Yahoo Finance.")

    df = df.reset_index()

    # Handle columns safely
    if "Date" not in df.columns:
        raise ValueError(f"Unexpected columns from Yahoo Finance: {df.columns.tolist()}")

    # Use Close price
    if "Close" not in df.columns:
        raise ValueError(f"Close column missing from Yahoo Finance output: {df.columns.tolist()}")

    df = df[["Date", "Close"]].copy()
    df.columns = ["date", "price"]
    df["date"] = pd.to_datetime(df["date"])
    df["price"] = pd.to_numeric(df["price"], errors="coerce")
    df = df.dropna().sort_values("date").reset_index(drop=True)

    if len(df) < 5:
        raise ValueError("Need at least 5 recent price rows to build live features.")

    return df


def build_price_features(price_df):
    df = price_df.copy()

    df["price_lag_1"] = df["price"].shift(1)
    df["price_lag_2"] = df["price"].shift(2)
    df["price_change_1"] = df["price"] - df["price_lag_1"]
    df["return_1"] = df["price"].pct_change(1)
    df["price_ma_3"] = df["price"].rolling(3).mean()
    df["price_ma_5"] = df["price"].rolling(5).mean()
    df["volatility_5"] = df["return_1"].rolling(5).std()

    latest = df.dropna().iloc[-1]

    return {
        "price": float(latest["price"]),
        "price_lag_1": float(latest["price_lag_1"]),
        "price_lag_2": float(latest["price_lag_2"]),
        "price_change_1": float(latest["price_change_1"]),
        "return_1": float(latest["return_1"]),
        "price_ma_3": float(latest["price_ma_3"]),
        "price_ma_5": float(latest["price_ma_5"]),
        "volatility_5": float(latest["volatility_5"])
    }


def main():
    print("Fetching live headlines from NewsAPI...")
    articles = fetch_newsapi_articles()
    news_features = build_news_features(articles)

    print("Fetching recent WTI prices from Yahoo Finance...")
    price_df = fetch_wti_history()
    price_features = build_price_features(price_df)

    feature_row = {**news_features, **price_features}
    live_df = pd.DataFrame([feature_row])

    # Force exact training column order
    live_df = live_df[FEATURE_COLUMNS]

    output_path = "data/processed/live_features.parquet"
    live_df.to_parquet(output_path, index=False)

    print("Saved live feature row to:", output_path)
    print(live_df)


if __name__ == "__main__":
    main()
