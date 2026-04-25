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

        # Price lag features
        merged["price_lag_1"] = merged["price"].shift(1)
        merged["price_lag_2"] = merged["price"].shift(2)

        # Price movement features
        merged["price_change_1"] = merged["price"] - merged["price_lag_1"]
        merged["return_1"] = merged["price"].pct_change(1)

        # Rolling averages
        merged["price_ma_3"] = merged["price"].rolling(3).mean()
        merged["price_ma_5"] = merged["price"].rolling(5).mean()

        # Rolling volatility
        merged["volatility_5"] = merged["return_1"].rolling(5).std()

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
