# src/ingest_news.py

import os
import requests
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("NEWS_API_KEY")
BASE_URL = "https://newsapi.org/v2/everything"

def fetch_news(query="oil OR energy OR OPEC OR gas",
               from_date="2023-01-01",
               to_date="2023-01-10"):

    params = {
        "q": query,
        "from": from_date,
        "to": to_date,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": 100,
        "apiKey": API_KEY
    }

    response = requests.get(BASE_URL, params=params)

    # 🚨 Remove bad API responses
    if response.status_code != 200:
        raise Exception(f"API request failed: {response.status_code}")

    data = response.json()

    # 🚨 Ensure valid NewsAPI response
    if data.get("status") != "ok":
        raise Exception(f"NewsAPI error: {data}")

    articles = data.get("articles", [])

    if not articles:
        raise ValueError("No articles returned from API")

    return articles


def json_to_dataframe(articles):

    # Extract structured fields
    records = []

    for article in articles:
        records.append({
            "published_at": article.get("publishedAt"),
            "source": article.get("source", {}).get("name"),
            "author": article.get("author"),
            "title": article.get("title"),
            "description": article.get("description"),
            "content": article.get("content"),
            "url": article.get("url")
        })

    df = pd.DataFrame(records)

    return df


def clean_news_dataframe(df):

    # 🔹 Normalize date
    df["published_at"] = pd.to_datetime(df["published_at"], errors="coerce")
    df["date"] = df["published_at"].dt.date

    # 🔹 Remove rows where date conversion failed
    df = df.dropna(subset=["date"])

    # 🔹 Remove null or empty article text
    df = df.dropna(subset=["content"])
    df = df[df["content"].str.strip() != ""]

    # 🔹 Remove duplicates (based on title + date)
    df = df.drop_duplicates(subset=["title", "date"])

    # 🔹 Select final structured schema
    df = df[[
        "date",
        "published_at",
        "source",
        "author",
        "title",
        "description",
        "content",
        "url"
    ]]

    # 🔹 Sort for consistency
    df = df.sort_values("published_at")

    return df


def save_to_table(df, path="data/processed/news_table.parquet"):

    # Store as structured table (parquet recommended)
    df.to_parquet(path, index=False)


if __name__ == "__main__":

    print("Fetching news from NewsAPI...")
    articles = fetch_news()

    print("Converting JSON to structured dataframe...")
    df = json_to_dataframe(articles)

    print("Cleaning dataframe...")
    clean_df = clean_news_dataframe(df)

    print("Saving structured table...")
    save_to_table(clean_df)

    print("News ingestion pipeline completed successfully.")
