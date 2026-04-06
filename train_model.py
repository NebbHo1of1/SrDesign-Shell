import os
import argparse
import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import classification_report, accuracy_score

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=str, default="gradient",
    choices=["gradient", "logistic", "forest"])
    args = parser.parse_args()	
    parquet_path = "data/processed/model_training_table.parquet"

    if not os.path.exists(parquet_path):
        raise FileNotFoundError(f"Could not find {parquet_path}")

    df = pd.read_parquet(parquet_path)

    # Define target: meaningful next-day upward move
    df["future_return_3"] = df["price"].shift(-3) / df["price"] - 1
    df["target_up_down"] = (df["future_return_3"] > 0.01).astype(int)
    print("\nNEW Target distribution:\n", df["target_up_down"].value_counts())
    
    # Downside pressure features
    df["neg_tone_flag"] = (df["avg_tone"] < 0).astype(int)
    df["strong_neg_tone"] = (df["avg_tone"] < -0.5).astype(int)

    # Volatility direction signal
    df["volatility_spike"] = (df["volatility_5"] > df["volatility_5"].rolling(5).mean()).astype(int)

    # Price drop signal
    df["down_momentum"] = (df["price"] < df["price_lag_1"]).astype(int)  

    # Add engineered features
    df["price_diff_1"] = df["price"] - df["price_lag_1"]
    df["price_diff_2"] = df["price_lag_1"] - df["price_lag_2"]
    df["tone_ma_3"] = df["avg_tone"].rolling(3).mean()
    df["tone_x_volatility"] = df["avg_tone"] * df["volatility_5"]
   
    # Short-term momentum (VERY IMPORTANT)
    df["return_1"] = df["price"].pct_change()
    df["return_2"] = df["price"].pct_change(2)

    # Trend strength
    df["trend_strength"] = df["price_ma_3"] - df["price_ma_5"]

    # Acceleration (THIS ONE IS BIG)
    df["acceleration"] = df["return_1"] - df["return_2"]

    # Sentiment change (not just average)
    df["tone_change"] = df["avg_tone"] - df["avg_tone"].shift(1)
 
    # adding one feature @ a time
    df["momentum_3"] = df["price"] - df["price_lag_2"]

    print(f"Dataset loaded: {df.shape[0]} rows, {df.shape[1]} columns")
    print(f"Columns: {df.columns.tolist()}")
    
    # Check for missing values
    print(f"\nMissing values:\n{df.isna().sum()}")
    
    # Drop rows with missing target
    df = df.dropna(subset=["target_up_down"])

    # Drow rows with NaNsfrom feature engineering
    df = df.dropna()

    # Prepare features and target
    y = df["target_up_down"]

    # Keep only numeric columns, then remove target leakage columns
    X = df.select_dtypes(include=["number"]).drop(
    columns=["target_up_down", "next_price", "next_day_return", "future_return_3"],
    errors="ignore"
    ) 

    
    print("\nFINAL FEATURES USED:")
    print(X.columns.tolist())
    
    print(f"\nFeatures shape after dropping non-numeric: {X.shape}")
    print(f"Numeric columns: {X.columns.tolist()}")
    print(f"Target distribution:\n{y.value_counts()}")
 
    from sklearn.model_selection import TimeSeriesSplit

    tscv = TimeSeriesSplit(n_splits=5)

    scores = []

    for train_idx, test_idx in tscv.split(X):
        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

        model = GradientBoostingClassifier(
        n_estimators=300,
        learning_rate=0.03,
        max_depth=3,
        random_state=42)

        model.fit(X_train, y_train)
        preds = model.predict(X_test)

        acc = accuracy_score(y_test, preds)
        scores.append(acc)

    print("\nCross-Validation Accuracy Scores:", scores)
    print("Average Accuracy:", sum(scores) / len(scores))

    # Select model
    if args.model == "gradient":
        model = GradientBoostingClassifier(
    n_estimators=300,
    learning_rate=0.03,
    max_depth=3,
    random_state=42)

    elif args.model == "logistic":
        model = LogisticRegression(max_iter=1000, class_weight="balanced")

    elif args.model == "forest":
        model = RandomForestClassifier(
    n_estimators=200,
    random_state=42,
    class_weight="balanced")

    # Train model
    print("\nTraining model...")
    model.fit(X_train, y_train)

    # Evaluate
    probs = model.predict_proba(X_test)[:, 1]

    preds = []
    for p in probs:
        if p > 0.7:
            preds.append(1)
    	elif p < 0.3:
            preds.append(0)
    	else:
            preds.append(-1)  # unsure zone

    print("\nSample probabilities:", probs[:10])

    filtered_preds = []
    filtered_y = []

    for i in range(len(preds)):
    	if preds[i] != -1:
            filtered_preds.append(preds[i])
            filtered_y.append(y_test.iloc[i])

    print("\n" + "=" * 50)
    print("MODEL PERFORMANCE")
    print("=" * 50)
    print("Total test samples:", len(y_test))
    print("Confident predictions:", len(filtered_preds))

    if len(filtered_preds) > 0:
        print("Confident accuracy:", round(accuracy_score(filtered_y, filtered_preds), 4))
    	print("\nClassification Report (Confident Only):\n")
    	print(classification_report(filtered_y, filtered_preds))
    else:
        print("No confident predictions made.")

    # Feature importance / coefficients
    if args.model in ["gradient", "forest"]:
        feature_importance = pd.DataFrame({
            "feature": X.columns,
            "importance": model.feature_importances_
        }).sort_values("importance", ascending=False)

        print("\nTop 5 Most Important Features:")
        print(feature_importance.head())

    elif args.model == "logistic":
        feature_importance = pd.DataFrame({
            "feature": X.columns,
            "importance": abs(model.coef_[0])
        }).sort_values("importance", ascending=False)

        print("\nTop 5 Most Important Features:")
        print(feature_importance.head())

    # Save model
    os.makedirs("models", exist_ok=True)
    joblib.dump(model, "models/prediction_model.joblib")

    print("\nModel saved to models/prediction_model.joblib")


if __name__ == "__main__":
    main()
