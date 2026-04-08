import logging
import os
import argparse
import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import classification_report, accuracy_score
from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import StandardScaler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)


def drop_nan_with_log(df: pd.DataFrame, subset=None, stage: str = "") -> pd.DataFrame:
    """Drop rows with NaN values and log how many were removed."""
    before = len(df)
    df = df.dropna(subset=subset) if subset else df.dropna()
    removed = before - len(df)
    label = f"subset={subset}" if subset else "any column"
    log.info("[%s] Dropped %d rows with NaN in %s → %d rows remain", stage, removed, label, len(df))
    return df


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--model", type=str, default="gradient",
        choices=["gradient", "logistic", "forest"],
    )
    args = parser.parse_args()

    parquet_path = "data/processed/model_training_table.parquet"
    if not os.path.exists(parquet_path):
        raise FileNotFoundError(f"Could not find {parquet_path}")

    df = pd.read_parquet(parquet_path)
    log.info("Raw data loaded: %d rows, %d columns", *df.shape)
    log.info("Columns: %s", df.columns.tolist())

    # ------------------------------------------------------------------ #
    # 1. Compute target BEFORE feature engineering so NaN rows from       #
    #    shift(-3) are removed first, preventing NaN from propagating     #
    #    into rolling/lag features computed on adjacent rows.             #
    # ------------------------------------------------------------------ #
    df["future_return_3"] = df["price"].shift(-3) / df["price"] - 1

    # Drop rows where the target horizon extends beyond available data.
    # Must happen BEFORE computing target_up_down so that NaN is not
    # silently coerced to 0 by the boolean comparison.
    df = drop_nan_with_log(df, subset=["future_return_3"], stage="target-NaN removal")

    df["target_up_down"] = (df["future_return_3"] > 0.01).astype(int)
    log.info("Target distribution:\n%s", df["target_up_down"].value_counts().to_string())

    # ------------------------------------------------------------------ #
    # 2. Feature engineering on clean (no trailing NaN) data             #
    # ------------------------------------------------------------------ #

    # Downside pressure features
    df["neg_tone_flag"] = (df["avg_tone"] < 0).astype(int)
    df["strong_neg_tone"] = (df["avg_tone"] < -0.5).astype(int)

    # Volatility direction signal
    df["volatility_spike"] = (df["volatility_5"] > df["volatility_5"].rolling(5).mean()).astype(int)

    # Price drop signal
    df["down_momentum"] = (df["price"] < df["price_lag_1"]).astype(int)

    # Price difference features
    df["price_diff_1"] = df["price"] - df["price_lag_1"]
    df["price_diff_2"] = df["price_lag_1"] - df["price_lag_2"]

    # Sentiment rolling features
    df["tone_ma_3"] = df["avg_tone"].rolling(3).mean()
    df["tone_x_volatility"] = df["avg_tone"] * df["volatility_5"]

    # Short-term momentum
    df["return_1"] = df["price"].pct_change()
    df["return_2"] = df["price"].pct_change(2)

    # Trend strength
    df["trend_strength"] = df["price_ma_3"] - df["price_ma_5"]

    # Acceleration
    df["acceleration"] = df["return_1"] - df["return_2"]

    # Sentiment change
    df["tone_change"] = df["avg_tone"] - df["avg_tone"].shift(1)

    # 3-period momentum
    df["momentum_3"] = df["price"] - df["price_lag_2"]

    log.info("After feature engineering: %d rows, %d columns", *df.shape)
    log.info("Missing values per column:\n%s", df.isna().sum().to_string())

    # ------------------------------------------------------------------ #
    # 3. Drop remaining NaN rows introduced by rolling/lag features       #
    # ------------------------------------------------------------------ #
    df = drop_nan_with_log(df, stage="post-feature-engineering NaN removal")

    log.info("Final clean dataset: %d rows, %d columns", *df.shape)

    # ------------------------------------------------------------------ #
    # 4. Prepare features and target                                      #
    #    Explicitly exclude all forward-looking / leakage columns.        #
    # ------------------------------------------------------------------ #
    LEAKAGE_COLUMNS = ["target_up_down", "future_return_3", "next_price", "next_day_return"]
    y = df["target_up_down"]
    X = df.select_dtypes(include=["number"]).drop(columns=LEAKAGE_COLUMNS, errors="ignore")

    log.info("Features used (%d): %s", X.shape[1], X.columns.tolist())
    log.info("Feature matrix shape: %s", X.shape)
    log.info("Target distribution:\n%s", y.value_counts().to_string())

    # ------------------------------------------------------------------ #
    # 5. Cross-validation with time-series split                          #
    # ------------------------------------------------------------------ #
    tscv = TimeSeriesSplit(n_splits=5)
    scores = []

    for train_idx, test_idx in tscv.split(X):
        X_train_cv, X_test_cv = X.iloc[train_idx], X.iloc[test_idx]
        y_train_cv, y_test_cv = y.iloc[train_idx], y.iloc[test_idx]

        cv_model = GradientBoostingClassifier(
            n_estimators=300,
            learning_rate=0.03,
            max_depth=3,
            random_state=42,
        )
        cv_model.fit(X_train_cv, y_train_cv)
        acc = accuracy_score(y_test_cv, cv_model.predict(X_test_cv))
        scores.append(acc)

    log.info("Cross-Validation Accuracy Scores: %s", scores)
    log.info("Average CV Accuracy: %.4f", sum(scores) / len(scores))

    # ------------------------------------------------------------------ #
    # 6. Final train / test split (last fold)                             #
    # ------------------------------------------------------------------ #
    train_idx, test_idx = list(tscv.split(X))[-1]
    X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
    y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

    # ------------------------------------------------------------------ #
    # 7. Select and configure model; apply scaler for logistic regression #
    # ------------------------------------------------------------------ #
    scaler = None

    if args.model == "gradient":
        model = GradientBoostingClassifier(
            n_estimators=300,
            learning_rate=0.03,
            max_depth=3,
            random_state=42,
        )
    elif args.model == "logistic":
        scaler = StandardScaler()
        X_train = scaler.fit_transform(X_train)
        X_test = scaler.transform(X_test)
        model = LogisticRegression(max_iter=1000, class_weight="balanced")
    elif args.model == "forest":
        model = RandomForestClassifier(
            n_estimators=200,
            random_state=42,
            class_weight="balanced",
        )

    # ------------------------------------------------------------------ #
    # 8. Train and evaluate                                               #
    # ------------------------------------------------------------------ #
    log.info("Training %s model...", args.model)
    model.fit(X_train, y_train)

    probs = model.predict_proba(X_test)[:, 1]
    log.info("Sample probabilities (first 10): %s", probs[:10].tolist())

    preds = []
    for p in probs:
        if p > 0.7:
            preds.append(1)
        elif p < 0.3:
            preds.append(0)
        else:
            preds.append(-1)  # unsure zone

    filtered_preds = [preds[i] for i in range(len(preds)) if preds[i] != -1]
    filtered_y = [y_test.iloc[i] for i in range(len(preds)) if preds[i] != -1]

    print("\n" + "=" * 50)
    print("MODEL PERFORMANCE")
    print("=" * 50)
    print("Total test samples:", len(y_test))
    print("Confident predictions:", len(filtered_preds))

    if filtered_preds:
        print("Confident accuracy:", round(accuracy_score(filtered_y, filtered_preds), 4))
        print("\nClassification Report (Confident Only):\n")
        print(classification_report(filtered_y, filtered_preds))
    else:
        print("No confident predictions made.")

    # ------------------------------------------------------------------ #
    # 9. Feature importance / coefficients                                #
    # ------------------------------------------------------------------ #
    if args.model in ["gradient", "forest"]:
        feature_importance = pd.DataFrame({
            "feature": X.columns,
            "importance": model.feature_importances_,
        }).sort_values("importance", ascending=False)
        print("\nTop 5 Most Important Features:")
        print(feature_importance.head())
    elif args.model == "logistic":
        feature_importance = pd.DataFrame({
            "feature": X.columns,
            "importance": abs(model.coef_[0]),
        }).sort_values("importance", ascending=False)
        print("\nTop 5 Most Important Features:")
        print(feature_importance.head())

    # ------------------------------------------------------------------ #
    # 10. Save model (and scaler when applicable)                         #
    # ------------------------------------------------------------------ #
    os.makedirs("models", exist_ok=True)
    model_path = "models/prediction_model.joblib"
    joblib.dump(model, model_path)
    log.info("Model saved to %s", model_path)

    if scaler is not None:
        scaler_path = "models/scaler.joblib"
        joblib.dump(scaler, scaler_path)
        log.info("Scaler saved to %s", scaler_path)


if __name__ == "__main__":
    main()
