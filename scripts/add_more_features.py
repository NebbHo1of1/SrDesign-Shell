import pandas as pd

INPUT_FILE = "data/processed/model_training_table.parquet"
OUTPUT_FILE = "data/processed/model_training_table_featured.parquet"

df = pd.read_parquet(INPUT_FILE)

# sort first so lag/rolling features work correctly
df = df.sort_values(["commodity", "date"]).reset_index(drop=True)

# make sure date is datetime
df["date"] = pd.to_datetime(df["date"])

# ----- ratio features -----
if {"positive_count", "negative_count", "neutral_count", "article_count"}.issubset(df.columns):
    df["positive_ratio"] = df["positive_count"] / df["article_count"].replace(0, pd.NA)
    df["negative_ratio"] = df["negative_count"] / df["article_count"].replace(0, pd.NA)
    df["neutral_ratio"] = df["neutral_count"] / df["article_count"].replace(0, pd.NA)

# ----- lag features -----
if "article_count" in df.columns:
    df["prev_article_count"] = df.groupby("commodity")["article_count"].shift(1)

if "avg_sentiment" in df.columns:
    df["prev_avg_sentiment"] = df.groupby("commodity")["avg_sentiment"].shift(1)

if "weekly_return" in df.columns:
    df["prev_week_return"] = df.groupby("commodity")["weekly_return"].shift(1)

if "next_day_return" in df.columns:
    df["prev_next_day_return"] = df.groupby("commodity")["next_day_return"].shift(1)

# ----- rolling averages -----
if "article_count" in df.columns:
    df["article_count_2wk_avg"] = (
        df.groupby("commodity")["article_count"]
        .transform(lambda s: s.rolling(2).mean())
    )
    df["article_count_4wk_avg"] = (
        df.groupby("commodity")["article_count"]
        .transform(lambda s: s.rolling(4).mean())
    )

if "avg_sentiment" in df.columns:
    df["sentiment_2wk_avg"] = (
        df.groupby("commodity")["avg_sentiment"]
        .transform(lambda s: s.rolling(2).mean())
    )
    df["sentiment_4wk_avg"] = (
        df.groupby("commodity")["avg_sentiment"]
        .transform(lambda s: s.rolling(4).mean())
    )

# ----- momentum / change features -----
if "avg_sentiment" in df.columns:
    df["sentiment_change_1wk"] = df.groupby("commodity")["avg_sentiment"].diff(1)

if "article_count" in df.columns:
    df["article_count_change_1wk"] = df.groupby("commodity")["article_count"].diff(1)

# ----- return-based features -----
if "next_day_return" in df.columns:
    df["return_2wk_avg"] = (
        df.groupby("commodity")["next_day_return"]
        .transform(lambda s: s.rolling(2).mean())
    )
    df["return_4wk_std"] = (
        df.groupby("commodity")["next_day_return"]
        .transform(lambda s: s.rolling(4).std())
    )

# drop rows with missing values from lag/rolling features
df = df.dropna().reset_index(drop=True)

df.to_parquet(OUTPUT_FILE, index=False)

print("Saved featured dataset to:", OUTPUT_FILE)
print("Rows:", len(df))
print("Columns:")
print(df.columns.tolist())
print(df.head())
