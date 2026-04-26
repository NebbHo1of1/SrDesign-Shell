"""
build_daily_training_table.py
==============================
Builds a daily-frequency training table for the Price Forecast Engine by
using price history as the base (one row per trading day) and forward-filling
news sentiment on days without articles.

This is a SEPARATE file from build_training_table.py and writes to a different
parquet path so that the Direction Signal Engine's model_training_table.parquet
is never modified.

Output
------
  data/processed/daily_training_table.parquet

Usage
-----
    python scripts/build_daily_training_table.py
"""

import math
import pandas as pd

NEWS_FEATURES = "data/processed/news_features.parquet"
PRICE_HISTORY = "data/processed/price_history.parquet"
OUTPUT = "data/processed/daily_training_table.parquet"


def main():
    news = pd.read_parquet(NEWS_FEATURES)
    prices = pd.read_parquet(PRICE_HISTORY)

    news["date"] = pd.to_datetime(news["date"])
    prices["date"] = pd.to_datetime(prices["date"])

    dfs = []
    for commodity in prices["commodity"].unique():
        p = prices[prices["commodity"] == commodity].sort_values("date").copy()
        n = news[news["commodity"] == commodity][["date", "article_count", "avg_tone"]].copy()

        # Left join: every trading day gets a price row; sentiment filled on news days only
        merged = p.merge(n, on="date", how="left")

        # Forward-fill sentiment so non-news days carry the most recent signal
        merged[["article_count", "avg_tone"]] = merged[["article_count", "avg_tone"]].ffill()

        # Trim rows before the first news entry (no prior sentiment to carry forward)
        merged = merged.dropna(subset=["article_count", "avg_tone"])

        # ------------------------------------------------------------------ #
        # Price lag features (1 – 10 trading days)                          #
        # ------------------------------------------------------------------ #
        for lag in range(1, 11):
            merged[f"price_lag_{lag}"] = merged["price"].shift(lag)

        # Return lags (1 – 10 trading days)
        merged["return_1"]  = merged["price"].pct_change(1)
        merged["return_2"]  = merged["price"].pct_change(2)
        merged["return_3"]  = merged["price"].pct_change(3)
        merged["return_5"]  = merged["price"].pct_change(5)
        merged["return_10"] = merged["price"].pct_change(10)

        # Price change features
        merged["price_change_1"] = merged["price"] - merged["price_lag_1"]
        merged["price_change_2"] = merged["price_lag_1"] - merged["price_lag_2"]

        # ------------------------------------------------------------------ #
        # Rolling averages (3, 5, 10, 20 trading-day windows)               #
        # ------------------------------------------------------------------ #
        merged["price_ma_3"]  = merged["price"].rolling(3).mean()
        merged["price_ma_5"]  = merged["price"].rolling(5).mean()
        merged["price_ma_10"] = merged["price"].rolling(10).mean()
        merged["price_ma_20"] = merged["price"].rolling(20).mean()

        # ------------------------------------------------------------------ #
        # Rolling volatility (5, 10, 20 windows)                            #
        # ------------------------------------------------------------------ #
        merged["volatility_5"]  = merged["return_1"].rolling(5).std()
        merged["volatility_10"] = merged["return_1"].rolling(10).std()
        merged["volatility_20"] = merged["return_1"].rolling(20).std()

        # ------------------------------------------------------------------ #
        # News-activity rolling features                                     #
        # ------------------------------------------------------------------ #
        merged["article_count_ma_5"]  = merged["article_count"].rolling(5).mean()
        merged["article_count_ma_10"] = merged["article_count"].rolling(10).mean()
        merged["tone_ma_5"]           = merged["avg_tone"].rolling(5).mean()
        merged["tone_ma_10"]          = merged["avg_tone"].rolling(10).mean()

        # ------------------------------------------------------------------ #
        # Calendar encoding (day-of-week, month) — purely backward-looking  #
        # ------------------------------------------------------------------ #
        merged["day_of_week"] = merged["date"].dt.dayofweek      # 0=Mon … 4=Fri
        merged["dow_sin"] = merged["day_of_week"].apply(
            lambda d: math.sin(2 * math.pi * d / 5)
        )
        merged["dow_cos"] = merged["day_of_week"].apply(
            lambda d: math.cos(2 * math.pi * d / 5)
        )

        # Future target
        merged["next_price"] = merged["price"].shift(-1)
        merged["next_day_return"] = (merged["next_price"] - merged["price"]) / merged["price"]
        merged["target_up_down"] = (merged["next_day_return"] > 0).astype(int)

        dfs.append(merged)

    df = pd.concat(dfs, ignore_index=True)
    df = df.sort_values(["commodity", "date"]).reset_index(drop=True)
    df = df.dropna().reset_index(drop=True)

    df.to_parquet(OUTPUT, index=False)

    print(f"Written {len(df)} rows to {OUTPUT}")
    print(f"Columns: {df.columns.tolist()}")
    print(f"Date range: {df['date'].min().date()} to {df['date'].max().date()}")
    print(df.head(3).to_string())


if __name__ == "__main__":
    main()
