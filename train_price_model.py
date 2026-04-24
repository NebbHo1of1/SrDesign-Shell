"""
train_price_model.py
====================
Price Forecast Engine — SIGNAL: A Shell Intelligence System
------------------------------------------------------------
This is a SEPARATE regression model that predicts the numerical crude oil
price for the next day.  It does NOT touch or replace the existing
Direction Signal Engine (models/prediction_model.joblib).

Model architecture
------------------
  Direction Signal Engine  →  models/prediction_model.joblib  (classifier, UP/DOWN)
  Price Forecast Engine    →  models/price_forecast_model.joblib  (regressor, $/bbl)

Usage
-----
    python train_price_model.py [--target {next_price,future_price_3}]

Outputs
-------
  models/price_forecast_model.joblib   — best regression model (never overwrites prediction_model.joblib)
  outputs/price_predictions.csv        — actual vs predicted prices with error columns
"""

import logging
import math
import os
import warnings

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import StandardScaler

# Optional XGBoost — imported inside try/except so the script still runs
# when XGBoost is not installed.
try:
    from xgboost import XGBRegressor
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False

import argparse

# ---------------------------------------------------------------------------
# Logging configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

warnings.filterwarnings("ignore", category=UserWarning)


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def drop_nan_with_log(df: pd.DataFrame, subset=None, stage: str = "") -> pd.DataFrame:
    """Drop rows containing NaN values and log how many were removed."""
    before = len(df)
    df = df.dropna(subset=subset) if subset else df.dropna()
    removed = before - len(df)
    label = f"subset={subset}" if subset else "any column"
    log.info(
        "[%s] Dropped %d rows with NaN in %s → %d rows remain",
        stage, removed, label, len(df),
    )
    return df


def mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Mean Absolute Percentage Error — returns a percentage value (e.g. 2.4)."""
    mask = y_true != 0
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    """Return a dict with MAE, RMSE, MAPE, and R²."""
    mae  = mean_absolute_error(y_true, y_pred)
    rmse = math.sqrt(mean_squared_error(y_true, y_pred))
    mape_val = mape(y_true, y_pred)
    r2   = r2_score(y_true, y_pred)
    return {"MAE": mae, "RMSE": rmse, "MAPE (%)": mape_val, "R²": r2}


# ---------------------------------------------------------------------------
# Feature engineering (mirrors train_model.py — no shared state with it)
# ---------------------------------------------------------------------------

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Apply the same technical and sentiment feature engineering used by the
    Direction Signal Engine.  All computations are purely backward-looking
    so no future information leaks into X.
    """
    # --- Downside pressure flags ---
    df["neg_tone_flag"]   = (df["avg_tone"] < 0).astype(int)
    df["strong_neg_tone"] = (df["avg_tone"] < -0.5).astype(int)

    # --- Volatility spike flag ---
    df["volatility_spike"] = (
        df["volatility_5"] > df["volatility_5"].rolling(5).mean()
    ).astype(int)

    # --- Price momentum features ---
    df["down_momentum"] = (df["price"] < df["price_lag_1"]).astype(int)
    df["price_diff_1"]  = df["price"] - df["price_lag_1"]
    df["price_diff_2"]  = df["price_lag_1"] - df["price_lag_2"]

    # --- Sentiment rolling features ---
    df["tone_ma_3"]        = df["avg_tone"].rolling(3).mean()
    df["tone_x_volatility"] = df["avg_tone"] * df["volatility_5"]

    # --- Short-term returns ---
    df["return_2"] = df["price"].pct_change(2)

    # --- Trend and acceleration ---
    df["trend_strength"] = df["price_ma_3"] - df["price_ma_5"]
    df["acceleration"]   = df["return_1"] - df["return_2"]

    # --- Sentiment change ---
    df["tone_change"] = df["avg_tone"] - df["avg_tone"].shift(1)

    # --- 3-period momentum (price units) ---
    df["momentum_3"] = df["price"] - df["price_lag_2"]

    # --- Price position relative to moving averages (stationary ratios) ---
    df["price_vs_ma5"] = df["price"] / df["price_ma_5"] - 1
    df["ma3_vs_ma5"]   = df["price_ma_3"] / df["price_ma_5"] - 1

    # --- EWM-based indicators (no NaN row loss) ---

    # MACD
    _ema12          = df["price"].ewm(span=12, adjust=False).mean()
    _ema26          = df["price"].ewm(span=26, adjust=False).mean()
    df["macd"]        = _ema12 - _ema26
    df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean()
    df["macd_hist"]   = df["macd"] - df["macd_signal"]
    df["price_vs_ema12"] = _ema12 / df["price"] - 1
    df["ema12_vs_ema26"] = _ema12 / _ema26 - 1

    # RSI (Wilder EWM smoothing)
    _delta    = df["price"].diff()
    _avg_gain = _delta.clip(lower=0).ewm(com=13, adjust=False).mean()
    _avg_loss = (-_delta.clip(upper=0)).ewm(com=13, adjust=False).mean()
    df["rsi"]         = 100 - (100 / (1 + _avg_gain / _avg_loss.replace(0, float("nan"))))
    df["rsi_norm"]    = (df["rsi"] - 50) / 50   # centred on 0
    df["rsi_overbought"] = (df["rsi"] > 70).astype(int)
    df["rsi_oversold"]   = (df["rsi"] < 30).astype(int)

    # --- Cyclical calendar encoding ---
    df["date"] = pd.to_datetime(df["date"])
    df["month_sin"] = df["date"].dt.month.apply(lambda m: math.sin(2 * math.pi * m / 12))
    df["month_cos"] = df["date"].dt.month.apply(lambda m: math.cos(2 * math.pi * m / 12))

    # --- Sentiment × technical interaction features ---
    df["macd_x_tone"] = df["macd_hist"] * df["avg_tone"]
    df["rsi_x_tone"]  = df["rsi_norm"]  * df["avg_tone"]
    df["macd_x_vol"]  = df["macd_hist"] * df["volatility_5"]

    return df


# ---------------------------------------------------------------------------
# Main training routine
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Train the Price Forecast Engine (regression model)."
    )
    parser.add_argument(
        "--target",
        type=str,
        default="next_price",
        choices=["next_price", "future_price_3"],
        help=(
            "Regression target column.  "
            "'next_price'    = price of the next available data point (already in parquet).  "
            "'future_price_3' = price 3 periods into the future (computed via shift(-3)).  "
            "Default: next_price"
        ),
    )
    args = parser.parse_args()

    # ------------------------------------------------------------------
    # 1. Load data
    # ------------------------------------------------------------------
    parquet_path = "data/processed/model_training_table.parquet"
    if not os.path.exists(parquet_path):
        raise FileNotFoundError(
            f"Training data not found at '{parquet_path}'.  "
            "Run scripts/build_training_table.py first."
        )

    df = pd.read_parquet(parquet_path)
    log.info("Raw data loaded: %d rows × %d columns", *df.shape)
    log.info("Columns: %s", df.columns.tolist())

    # ------------------------------------------------------------------
    # 2. Build regression target
    #    All leakage columns must be declared BEFORE X is assembled so
    #    they are reliably excluded from the feature matrix.
    # ------------------------------------------------------------------
    if args.target == "next_price":
        # 'next_price' = price shifted -1 and is already present in the parquet.
        target_col = "next_price"
        log.info("Target: next_price (price of next trading day already in dataset)")

    else:  # future_price_3
        # Compute price 3 periods ahead — this loses 3 rows at the tail.
        df["future_price_3"] = df.groupby("commodity")["price"].shift(-3)
        target_col = "future_price_3"
        log.info("Target: future_price_3 (price 3 periods ahead, computed via shift(-3))")

    # Drop rows where the target is NaN (tail of each commodity series).
    df = drop_nan_with_log(df, subset=[target_col], stage="target-NaN removal")

    log.info(
        "Target '%s' stats — min: %.2f, max: %.2f, mean: %.2f",
        target_col, df[target_col].min(), df[target_col].max(), df[target_col].mean(),
    )

    # ------------------------------------------------------------------
    # 3. Feature engineering (purely backward-looking; no leakage)
    # ------------------------------------------------------------------
    df = engineer_features(df)
    log.info("After feature engineering: %d rows × %d columns", *df.shape)

    # ------------------------------------------------------------------
    # 4. Assemble feature matrix X — explicitly exclude ALL forward-
    #    looking / leakage columns.
    #
    #    Leakage policy for regression:
    #      • next_price        — always excluded (is or derives the target)
    #      • next_day_return   — derived from next_price → leaks
    #      • target_up_down    — derived from next_day_return → leaks
    #      • future_price_3    — excluded when it is the target
    #      • future_return_3   — excluded (forward-looking return)
    #      • date / commodity  — metadata / non-numeric index columns
    #
    #    NOTE: Unlike the classifier, absolute price levels (price,
    #    price_lag_1, price_ma_3, etc.) ARE included here because they
    #    are strong predictors of the next day's absolute price.
    # ------------------------------------------------------------------
    LEAKAGE_COLUMNS = [
        "next_price",       # forward-looking — always excluded
        "next_day_return",  # derived from next_price
        "target_up_down",   # derived from next_day_return
        "future_price_3",   # forward-looking — always excluded
        "future_return_3",  # forward-looking return
        "date",             # metadata index (non-numeric)
        "commodity",        # categorical metadata
    ]

    y = df[target_col].values
    X = df.select_dtypes(include=["number"]).drop(
        columns=LEAKAGE_COLUMNS, errors="ignore"
    )

    log.info("Leakage columns excluded: %s", LEAKAGE_COLUMNS)
    log.info("Features used (%d): %s", X.shape[1], X.columns.tolist())
    log.info("Feature matrix shape: %s", X.shape)
    log.info("Target vector shape : %s", y.shape)

    # Drop any remaining NaN rows (introduced by rolling/lag features).
    combined = X.copy()
    combined["__target__"] = y
    combined = drop_nan_with_log(combined, stage="post-feature-engineering NaN removal")
    y = combined.pop("__target__").values
    X = combined
    log.info("Final clean dataset: %d rows × %d feature columns", *X.shape)

    # ------------------------------------------------------------------
    # 5. Time-series cross-validation (5 folds)
    #    TimeSeriesSplit ensures training data always precedes test data,
    #    respecting the temporal ordering of oil-price observations.
    # ------------------------------------------------------------------
    tscv = TimeSeriesSplit(n_splits=5)

    # Define all candidate models.  Ridge uses StandardScaler internally
    # so its scaler is constructed per-fold inside the loop.
    def make_models():
        candidates = {
            "Ridge": Ridge(alpha=1.0),
            "RandomForest": RandomForestRegressor(
                n_estimators=500,
                random_state=42,
                n_jobs=-1,
            ),
            "GradientBoosting": GradientBoostingRegressor(
                n_estimators=300,
                learning_rate=0.03,
                max_depth=3,
                random_state=42,
            ),
        }
        if XGBOOST_AVAILABLE:
            candidates["XGBoost"] = XGBRegressor(
                n_estimators=300,
                learning_rate=0.03,
                max_depth=3,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=42,
                verbosity=0,
            )
        else:
            log.warning("XGBoost not installed — skipping XGBRegressor.")
        return candidates

    model_names = list(make_models().keys())
    cv_results = {name: [] for name in model_names}

    log.info("Starting %d-fold time-series cross-validation...", tscv.n_splits)

    for fold, (train_idx, test_idx) in enumerate(tscv.split(X), start=1):
        X_tr, X_te = X.iloc[train_idx].values, X.iloc[test_idx].values
        y_tr, y_te = y[train_idx], y[test_idx]

        for name, mdl in make_models().items():
            # Ridge requires scaling; all others work on raw features.
            if name == "Ridge":
                sc = StandardScaler()
                X_tr_fit = sc.fit_transform(X_tr)
                X_te_fit = sc.transform(X_te)
            else:
                X_tr_fit, X_te_fit = X_tr, X_te

            mdl.fit(X_tr_fit, y_tr)
            preds = mdl.predict(X_te_fit)
            metrics = regression_metrics(y_te, preds)
            cv_results[name].append(metrics)
            log.info(
                "  Fold %d | %-18s | MAE=%.3f  RMSE=%.3f  MAPE=%.2f%%  R²=%.4f",
                fold, name, metrics["MAE"], metrics["RMSE"],
                metrics["MAPE (%)"], metrics["R²"],
            )

    # Aggregate CV results (mean across folds).
    log.info("\nCross-validation summary (mean across %d folds):", tscv.n_splits)
    cv_summary = {}
    for name in model_names:
        folds_data = cv_results[name]
        cv_summary[name] = {
            k: float(np.mean([f[k] for f in folds_data]))
            for k in folds_data[0]
        }
        log.info(
            "  %-18s | MAE=%.3f  RMSE=%.3f  MAPE=%.2f%%  R²=%.4f",
            name,
            cv_summary[name]["MAE"],
            cv_summary[name]["RMSE"],
            cv_summary[name]["MAPE (%)"],
            cv_summary[name]["R²"],
        )

    # ------------------------------------------------------------------
    # 6. Final holdout evaluation (last TimeSeriesSplit fold)
    #    This mimics real-world deployment: the model is trained on all
    #    past data and evaluated on the most recent unseen observations.
    # ------------------------------------------------------------------
    last_train_idx, last_test_idx = list(tscv.split(X))[-1]
    X_train = X.iloc[last_train_idx].values
    X_test  = X.iloc[last_test_idx].values
    y_train = y[last_train_idx]
    y_test  = y[last_test_idx]
    # Keep the date index for the output CSV (needed for the dashboard later).
    test_dates = df["date"].iloc[last_test_idx].values

    log.info(
        "Final holdout — train: %d rows, test: %d rows",
        len(y_train), len(y_test),
    )

    holdout_results = {}
    trained_models  = {}
    scalers         = {}

    for name, mdl in make_models().items():
        if name == "Ridge":
            sc = StandardScaler()
            X_tr_fit = sc.fit_transform(X_train)
            X_te_fit = sc.transform(X_test)
            scalers[name] = sc
        else:
            X_tr_fit, X_te_fit = X_train, X_test

        mdl.fit(X_tr_fit, y_tr)
        preds = mdl.predict(X_te_fit)
        metrics = regression_metrics(y_test, preds)
        holdout_results[name] = {**metrics, "predictions": preds}
        trained_models[name]  = mdl
        log.info(
            "  Holdout %-18s | MAE=%.3f  RMSE=%.3f  MAPE=%.2f%%  R²=%.4f",
            name, metrics["MAE"], metrics["RMSE"],
            metrics["MAPE (%)"], metrics["R²"],
        )

    # ------------------------------------------------------------------
    # 7. Print comparison table
    # ------------------------------------------------------------------
    print("\n" + "=" * 70)
    print("PRICE FORECAST ENGINE — MODEL COMPARISON")
    print(f"Target: {target_col}  |  Holdout size: {len(y_test)} rows")
    print("=" * 70)
    header = f"{'Model':<20} {'MAE':>8} {'RMSE':>8} {'MAPE (%)':>10} {'R²':>8}"
    print(header)
    print("-" * 70)
    for name in model_names:
        m = holdout_results[name]
        print(
            f"{name:<20} {m['MAE']:>8.3f} {m['RMSE']:>8.3f} "
            f"{m['MAPE (%)']:>10.2f} {m['R²']:>8.4f}"
        )
    print("=" * 70)

    # ------------------------------------------------------------------
    # 8. Select best model by lowest MAE on the holdout set
    # ------------------------------------------------------------------
    best_name = min(
        model_names,
        key=lambda n: holdout_results[n]["MAE"],
    )
    best_metrics = holdout_results[best_name]
    best_model   = trained_models[best_name]
    best_preds   = best_metrics["predictions"]

    print(f"\n✅ Best model: {best_name}")
    print(
        f"   MAE={best_metrics['MAE']:.3f}  "
        f"RMSE={best_metrics['RMSE']:.3f}  "
        f"MAPE={best_metrics['MAPE (%)']:.2f}%  "
        f"R²={best_metrics['R²']:.4f}"
    )

    # ------------------------------------------------------------------
    # 9. Save the best model
    #    IMPORTANT: we write to 'price_forecast_model.joblib' only.
    #    'prediction_model.joblib' (the classifier) is never touched.
    # ------------------------------------------------------------------
    os.makedirs("models", exist_ok=True)
    model_save_path = "models/price_forecast_model.joblib"

    save_bundle = {"model": best_model, "features": X.columns.tolist(), "target": target_col}
    if best_name == "Ridge" and best_name in scalers:
        save_bundle["scaler"] = scalers[best_name]
        log.info("Ridge scaler included in saved bundle.")

    joblib.dump(save_bundle, model_save_path)
    log.info("Best model ('%s') saved to %s", best_name, model_save_path)

    # Confirm classifier is untouched.
    if os.path.exists("models/prediction_model.joblib"):
        log.info("✅ Direction Signal Engine (models/prediction_model.joblib) is untouched.")
    else:
        log.warning("models/prediction_model.joblib not found — was it already missing?")

    # ------------------------------------------------------------------
    # 10. Build and save the holdout predictions CSV
    #     Columns: Date | Actual Price | Predicted Price | Error | Percent Error
    # ------------------------------------------------------------------
    actual_prices  = y_test
    errors         = np.abs(actual_prices - best_preds)
    pct_errors     = np.where(
        actual_prices != 0,
        (errors / np.abs(actual_prices)) * 100,
        np.nan,
    )

    predictions_df = pd.DataFrame({
        "Date":            pd.to_datetime(test_dates).strftime("%Y-%m-%d"),
        "Actual Price":    np.round(actual_prices, 2),
        "Predicted Price": np.round(best_preds, 2),
        "Error":           np.round(errors, 2),
        "Percent Error":   np.round(pct_errors, 4),
    })

    os.makedirs("outputs", exist_ok=True)
    csv_path = "outputs/price_predictions.csv"
    predictions_df.to_csv(csv_path, index=False)
    log.info("Holdout predictions saved to %s", csv_path)

    # Print sample output table.
    print("\n" + "=" * 70)
    print("HOLDOUT PREDICTIONS SAMPLE (first 10 rows)")
    print("=" * 70)
    print(predictions_df.head(10).to_string(index=False))
    print("=" * 70)
    print(f"\nFull predictions written to: {csv_path}")
    print(f"Model saved to             : {model_save_path}")
    print("\nPrice Forecast Engine training complete.")


if __name__ == "__main__":
    main()
