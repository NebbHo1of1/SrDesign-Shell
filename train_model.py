import os
import joblib
import pandas as pd
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score
from sklearn.model_selection import train_test_split

analyzer = SentimentIntensityAnalyzer()


def label_headline(title: str) -> str:
    sentiment = analyzer.polarity_scores(str(title))["compound"]

    if sentiment > 0.15:
        return "UP"
    elif sentiment < -0.15:
        return "DOWN"
    return "NEUTRAL"


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df["title"] = df["title"].fillna("").astype(str)
    df["sentiment_score"] = df["title"].apply(
        lambda x: analyzer.polarity_scores(x)["compound"]
    )
    df["impact_score"] = df["sentiment_score"].abs() * 100
    df["title_length"] = df["title"].apply(len)
    df["label"] = df["title"].apply(label_headline)

    return df


def main():
    parquet_path = "data/processed/news_table.parquet"

    if not os.path.exists(parquet_path):
        raise FileNotFoundError(f"Could not find {parquet_path}")

    df = pd.read_parquet(parquet_path)
    df = df.dropna(subset=["title"])

    df = build_features(df)

    feature_cols = ["sentiment_score", "impact_score", "title_length"]
    X = df[feature_cols]
    y = df["label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = LogisticRegression(max_iter=1000)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)

    print("Accuracy:", round(accuracy_score(y_test, preds), 4))
    print("\nClassification Report:\n")
    print(classification_report(y_test, preds))

    os.makedirs("models", exist_ok=True)
    joblib.dump(model, "models/prediction_model.joblib")

    print("\nModel saved to models/prediction_model.joblib")


if __name__ == "__main__":
    main()
