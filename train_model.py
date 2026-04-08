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
from tabpfn import TabPFNClassifier
from xgboost import XGBClassifier

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
        "--model", type=str, default="forest",
        choices=["gradient", "logistic", "forest", "tabpfn", "xgboost"],
    )
    parser.add_argument(
        "--threshold", type=float, default=0.75,
        help=(
            "Confidence threshold (0.50–0.95). Predictions with p > threshold are "
            "classified as UP; predictions with p < (1 - threshold) are classified "
            "as DOWN; everything else is labelled uncertain and excluded from the "
            "confident-only accuracy report. Also used as the decision boundary for "
            "full-test accuracy (conservative toward the majority class). Default: 0.75."
        ),
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

    # Stationary ratio features (price position relative to moving averages)
    df["price_vs_ma5"] = df["price"] / df["price_ma_5"] - 1
    df["ma3_vs_ma5"] = df["price_ma_3"] / df["price_ma_5"] - 1

    # ------------------------------------------------------------------ #
    # EWM-based technical indicators (no NaN row loss from windowing)     #
    # ------------------------------------------------------------------ #

    # MACD (Moving Average Convergence Divergence)
    _ema12 = df["price"].ewm(span=12, adjust=False).mean()
    _ema26 = df["price"].ewm(span=26, adjust=False).mean()
    df["macd"] = _ema12 - _ema26
    df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean()
    df["macd_hist"] = df["macd"] - df["macd_signal"]
    df["price_vs_ema12"] = _ema12 / df["price"] - 1
    df["ema12_vs_ema26"] = _ema12 / _ema26 - 1

    # RSI (Relative Strength Index) using Wilder EWM smoothing
    _delta = df["price"].diff()
    _avg_gain = _delta.clip(lower=0).ewm(com=13, adjust=False).mean()
    _avg_loss = (-_delta.clip(upper=0)).ewm(com=13, adjust=False).mean()
    df["rsi"] = 100 - (100 / (1 + _avg_gain / _avg_loss.replace(0, float("nan"))))
    df["rsi_norm"] = (df["rsi"] - 50) / 50   # centred on 0; negative = oversold
    df["rsi_overbought"] = (df["rsi"] > 70).astype(int)
    df["rsi_oversold"] = (df["rsi"] < 30).astype(int)

    # Cyclical calendar encoding (captures oil-price seasonality)
    df["date"] = pd.to_datetime(df["date"])
    import math as _math
    df["month_sin"] = df["date"].dt.month.apply(lambda m: _math.sin(2 * _math.pi * m / 12))
    df["month_cos"] = df["date"].dt.month.apply(lambda m: _math.cos(2 * _math.pi * m / 12))

    # Sentiment × technical interaction features
    df["macd_x_tone"] = df["macd_hist"] * df["avg_tone"]
    df["rsi_x_tone"] = df["rsi_norm"] * df["avg_tone"]
    df["macd_x_vol"] = df["macd_hist"] * df["volatility_5"]

    log.info("After feature engineering: %d rows, %d columns", *df.shape)
    log.info("Missing values per column:\n%s", df.isna().sum().to_string())

    # ------------------------------------------------------------------ #
    # 3. Drop remaining NaN rows introduced by rolling/lag features       #
    # ------------------------------------------------------------------ #
    df = drop_nan_with_log(df, stage="post-feature-engineering NaN removal")

    log.info("Final clean dataset: %d rows, %d columns", *df.shape)

    # ------------------------------------------------------------------ #
    # 4. Prepare features and target                                      #
    #    Explicitly exclude forward-looking / leakage columns AND        #
    #    raw non-stationary price levels (absolute price values do not   #
    #    generalise; use only price-change / return features instead).   #
    # ------------------------------------------------------------------ #
    LEAKAGE_COLUMNS = ["target_up_down", "future_return_3", "next_price", "next_day_return"]

    # The parquet already contains price_change_1 (= price - price_lag_1).
    # price_diff_1 is the same quantity recomputed above; drop the duplicate
    # so the model sees that signal only once.
    # "date" is also excluded – it is a non-numeric index used only for calendar
    # feature derivation above and must not be fed raw into the model.
    NON_STATIONARY_COLUMNS = [
        "price", "price_lag_1", "price_lag_2", "price_ma_3", "price_ma_5",
        "price_diff_1",
    ]

    DROP_COLUMNS = LEAKAGE_COLUMNS + NON_STATIONARY_COLUMNS
    y = df["target_up_down"]
    X = df.select_dtypes(include=["number"]).drop(columns=DROP_COLUMNS, errors="ignore")

    log.info("Excluded non-stationary price levels: %s", NON_STATIONARY_COLUMNS)
    log.info("Features used (%d): %s", X.shape[1], X.columns.tolist())
    log.info("Feature matrix shape: %s", X.shape)
    log.info("Target distribution:\n%s", y.value_counts().to_string())

    # ------------------------------------------------------------------ #
    # 5. Cross-validation with time-series split                          #
    # ------------------------------------------------------------------ #
    tscv = TimeSeriesSplit(n_splits=5)
    scores = []

    for fold, (train_idx, test_idx) in enumerate(tscv.split(X)):
        X_train_cv, X_test_cv = X.iloc[train_idx], X.iloc[test_idx]
        y_train_cv, y_test_cv = y.iloc[train_idx], y.iloc[test_idx]

        if args.model == "gradient":
            cv_model = GradientBoostingClassifier(
                n_estimators=300,
                learning_rate=0.03,
                max_depth=3,
                random_state=42,
            )
        elif args.model == "logistic":
            scaler_cv = StandardScaler()
            X_train_cv = scaler_cv.fit_transform(X_train_cv)
            X_test_cv = scaler_cv.transform(X_test_cv)
            cv_model = LogisticRegression(max_iter=1000, class_weight="balanced")
        elif args.model == "forest":
            cv_model = RandomForestClassifier(
                n_estimators=500,
                random_state=42,
                class_weight={0: 1, 1: 2},
            )
        elif args.model == "tabpfn":
            cv_model = TabPFNClassifier(device="cpu", ignore_pretraining_limits=True)
        elif args.model == "xgboost":
            pos_cv = int((y_train_cv == 1).sum())
            neg_cv = int((y_train_cv == 0).sum())
            if pos_cv == 0:
                log.warning("Fold %d: no positive-class samples in training split; scale_pos_weight set to 1.", fold + 1)
            cv_model = XGBClassifier(
                n_estimators=300,
                learning_rate=0.03,
                max_depth=3,
                subsample=0.8,
                colsample_bytree=0.8,
                scale_pos_weight=neg_cv / max(pos_cv, 1),
                random_state=42,
                eval_metric="logloss",
                verbosity=0,
            )

        cv_model.fit(X_train_cv, y_train_cv)
        acc = accuracy_score(y_test_cv, cv_model.predict(X_test_cv))
        scores.append(acc)
        log.info("  Fold %d: train=%d, test=%d, acc=%.4f", fold + 1, len(train_idx), len(test_idx), acc)

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
            n_estimators=500,
            random_state=42,
            class_weight={0: 1, 1: 2},
        )
    elif args.model == "tabpfn":
        model = TabPFNClassifier(device="cpu", ignore_pretraining_limits=True)
    elif args.model == "xgboost":
        pos_n = int((y_train == 1).sum())
        neg_n = int((y_train == 0).sum())
        if pos_n == 0:
            log.warning("No positive-class samples in training set; scale_pos_weight set to 1.")
        model = XGBClassifier(
            n_estimators=300,
            learning_rate=0.03,
            max_depth=3,
            subsample=0.8,
            colsample_bytree=0.8,
            scale_pos_weight=neg_n / max(pos_n, 1),
            random_state=42,
            eval_metric="logloss",
            verbosity=0,
        )

    # ------------------------------------------------------------------ #
    # 8. Train and evaluate                                               #
    # ------------------------------------------------------------------ #
    log.info("Training %s model...", args.model)
    model.fit(X_train, y_train)

    probs = model.predict_proba(X_test)[:, 1]
    log.info("Sample probabilities (first 10): %s", probs[:10].tolist())

    # ------------------------------------------------------------------ #
    # Threshold-based prediction                                           #
    # p > threshold        → class 1  (confident UP)                     #
    # p < (1 - threshold)  → class 0  (confident DOWN)                   #
    # otherwise            → uncertain (excluded from confident report)   #
    # Full-test prediction uses the threshold as its decision boundary    #
    # (conservative: uncertain zone defaults to class 0).                 #
    # ------------------------------------------------------------------ #
    conf_high = args.threshold
    conf_low = 1.0 - args.threshold

    full_preds = (probs >= conf_high).astype(int)  # conservative: uncertain → 0

    conf_mask = (probs >= conf_high) | (probs <= conf_low)
    conf_preds = (probs[conf_mask] >= conf_high).astype(int)
    conf_y = y_test.values[conf_mask]

    print("\n" + "=" * 50)
    print("MODEL PERFORMANCE")
    print("=" * 50)
    print(f"Decision threshold : {conf_high:.2f}  (uncertain zone: {conf_low:.2f}–{conf_high:.2f})")
    print(f"Total test samples : {len(y_test)}")
    print()
    print(f"--- Full test-set accuracy (uncertain predicted as DOWN) ---")
    print(f"Accuracy: {accuracy_score(y_test, full_preds):.4f}")
    print()
    print("Classification Report:\n")
    print(classification_report(y_test, full_preds))

    print(f"--- Confident predictions only (p>{conf_high:.2f} or p<{conf_low:.2f}) ---")
    print(f"Confident predictions : {conf_mask.sum()} / {len(y_test)}")
    if conf_mask.sum() > 0:
        print(f"Confident accuracy    : {accuracy_score(conf_y, conf_preds):.4f}")
        print()
        print("Classification Report (Confident Only):\n")
        print(classification_report(conf_y, conf_preds, zero_division=0))
    else:
        print("No confident predictions at this threshold — try lowering --threshold.")

    # ------------------------------------------------------------------ #
    # 9. Feature importance / coefficients                                #
    # ------------------------------------------------------------------ #
    if args.model in ["gradient", "forest", "xgboost"]:
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
    elif args.model == "tabpfn":
        print("\n(TabPFN is a prior-fitted network; per-feature importance is not directly available.)")

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
