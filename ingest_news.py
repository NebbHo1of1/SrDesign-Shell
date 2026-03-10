import os
import requests
import pandas as pd
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

API_KEY = os.getenv("NEWS_API_KEY")

if not API_KEY:
    raise ValueError("NEWS_API_KEY not found. Please add it to your .env file.")

BASE_URL = "https://newsapi.org/v2/everything"


def fetch_news(query="oil OR energy OR OPEC OR gas", from_date=None, to_date=None):
    if to_date is None:
        to_date = datetime.today().strftime("%Y-%m-%d")

    if from_date is None:
        from_date = (datetime.today() - timedelta(days=7)).strftime("%Y-%m-%d")

    params = {
        "q": query,
        "from": from_date,
        "to": to_date,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": 100,
        "apiKey": API_KEY
    }

    try:
        response = requests.get(BASE_URL, params=params, timeout=10)
        if response.status_code != 200:
            print("Status code:", response.status_code)
            print("Response:", response.text)
            raise Exception(f"API request failed: {response.status_code}")
    except requests.exceptions.RequestException as e:
        raise Exception(f"Request failed: {e}")

    data = response.json()

    if data.get("status") != "ok":
        raise Exception(f"NewsAPI error: {data}")

    articles = data.get("articles", [])

    if not articles:
        raise ValueError("No articles returned from API")

    return articles


def json_to_dataframe(articles):
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
    df["published_at"] = pd.to_datetime(df["published_at"], errors="coerce")
    df["date"] = df["published_at"].dt.date

    df = df.dropna(subset=["date"])

    df = df.dropna(subset=["content"])
    df = df[df["content"].str.strip() != ""]

    df = df.drop_duplicates(subset=["title", "date"])

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

    df = df.sort_values("published_at")

    return df


def save_to_table(df, path="data/processed/news_table.parquet"):
    os.makedirs(os.path.dirname(path), exist_ok=True)
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
