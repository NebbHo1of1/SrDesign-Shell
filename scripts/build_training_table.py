import pandas as pd

news = pd.read_parquet("data/processed/news_features.parquet")
prices = pd.read_parquet("data/processed/price_history.parquet")

news["date"] = pd.to_datetime(news["date"])
prices["date"] = pd.to_datetime(prices["date"])

df = news.merge(prices, on=["date", "commodity"], how="inner")
df = df.sort_values(["commodity", "date"]).reset_index(drop=True)

# Price lag features
df["price_lag_1"] = df.groupby("commodity")["price"].shift(1)
df["price_lag_2"] = df.groupby("commodity")["price"].shift(2)

# Price movement features
df["price_change_1"] = df["price"] - df["price_lag_1"]
df["return_1"] = df.groupby("commodity")["price"].pct_change(1)

# Rolling averages
df["price_ma_3"] = df.groupby("commodity")["price"].transform(lambda x: x.rolling(3).mean())
df["price_ma_5"] = df.groupby("commodity")["price"].transform(lambda x: x.rolling(5).mean())

# Rolling volatility
df["volatility_5"] = df.groupby("commodity")["return_1"].transform(lambda x: x.rolling(5).std())

# Future target
df["next_price"] = df.groupby("commodity")["price"].shift(-1)
df["next_day_return"] = (df["next_price"] - df["price"]) / df["price"]
df["target_up_down"] = (df["next_day_return"] > 0).astype(int)

df = df.dropna().reset_index(drop=True)

df.to_parquet("data/processed/model_training_table.parquet", index=False)

print("Updated model_training_table.parquet")
print(df.head())
print(df.columns)
print(len(df))
