import pandas as pd
import glob

files = glob.glob("data/raw/*.CSV")

all_data = []

for file in files:
    print(f"Processing {file}")

    df = pd.read_csv(file, sep="\t", header=None, low_memory=False)

    # GDELT 1.0 Events selected columns
    # 1  = SQLDATE
    # 5  = Actor1Name
    # 15 = Actor2Name
    # 30 = GoldsteinScale
    # 31 = NumMentions
    df = df.iloc[:, [1, 5, 15, 30, 31]].copy()
    df.columns = ["SQLDATE", "Actor1Name", "Actor2Name", "GoldsteinScale", "NumMentions"]

    df["date"] = pd.to_datetime(df["SQLDATE"], format="%Y%m%d", errors="coerce")
    df["Actor1Name"] = df["Actor1Name"].astype(str)
    df["Actor2Name"] = df["Actor2Name"].astype(str)
    df["GoldsteinScale"] = pd.to_numeric(df["GoldsteinScale"], errors="coerce")
    df["NumMentions"] = pd.to_numeric(df["NumMentions"], errors="coerce")

    keywords = ["oil", "opec", "energy", "gas", "crude", "petroleum", "refinery", "pipeline"]

    def is_oil_related(text):
        text = str(text).lower()
        return any(k in text for k in keywords)

    df = df[
        df["Actor1Name"].apply(is_oil_related) |
        df["Actor2Name"].apply(is_oil_related)
    ].copy()

    if not df.empty:
        all_data.append(df)

if not all_data:
    print("No oil-related rows found.")
    raise SystemExit

df = pd.concat(all_data, ignore_index=True)

df["positive_flag"] = (df["GoldsteinScale"] > 0).astype(int)
df["negative_flag"] = (df["GoldsteinScale"] < 0).astype(int)
df["high_impact_flag"] = (df["NumMentions"] >= 20).astype(int)

daily = df.groupby("date").agg(
    article_count=("NumMentions", "sum"),
    avg_tone=("GoldsteinScale", "mean"),
    positive_count=("positive_flag", "sum"),
    negative_count=("negative_flag", "sum"),
    high_impact_count=("high_impact_flag", "sum")
).reset_index()

daily["commodity"] = "WTI"
daily = daily[
    [
        "date",
        "commodity",
        "article_count",
        "avg_tone",
        "positive_count",
        "negative_count",
        "high_impact_count"
    ]
].dropna()

daily = daily.sort_values("date")

daily.to_parquet("data/processed/news_features.parquet", index=False)

print("Saved upgraded REAL news_features.parquet")
print(daily.head())
print(daily.tail())
print(daily.columns)
print(f"Total rows: {len(daily)}")
