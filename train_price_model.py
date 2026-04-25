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
    python train_price_model.py [--target {next_price,price_change,next_day_return,future_price_3}]

    Recommended for improved R²:
        python train_price_model.py --target price_change

Target modes
------------
  next_price      (default) predict absolute price level $/bbl  [original behaviour]
  price_change              predict Δprice = next_price − price; metrics on reconstructed abs price
  next_day_return           predict % return; metrics on reconstructed abs price
  future_price_3            predict price 3 periods ahead (original option)

Outputs
-------
  models/price_forecast_model.joblib   — best regression model (never overwrites prediction_model.joblib)
  outputs/price_predictions.csv        — actual vs predicted prices with error columns
"""

import argparse
import logging
import math
import os
import warnings

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import (
    GradientBoostingRegressor,
    HistGradientBoostingRegressor,
    RandomForestRegressor,
    StackingRegressor,
    VotingRegressor,
)
from sklearn.linear_model import ElasticNetCV, HuberRegressor, LassoCV, RidgeCV
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline

# Optional XGBoost
try:
    from xgboost import XGBRegressor
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False

# Optional LightGBM
try:
    from lightgbm import LGBMRegressor
    LIGHTGBM_AVAILABLE = True
except ImportError:
    LIGHTGBM_AVAILABLE = False

# ---------------------------------------------------------------------------
# Logging configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

warnings.filterwarnings("ignore", category=UserWarning)

# Linear models require StandardScaler before fitting.
LINEAR_MODELS = frozenset({"Ridge", "Lasso", "ElasticNet", "Huber"})


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


def reconstruct_price(
    raw_preds: np.ndarray,
    current_prices: np.ndarray,
    target_mode: str,
) -> np.ndarray:
    """
    Convert raw model predictions back to absolute $/bbl so that evaluation
    metrics are always in dollars regardless of the training target.

      price_change    : pred_abs = current_price + raw_pred
      next_day_return : pred_abs = current_price * (1 + raw_pred)
      next_price / future_price_3 : pred_abs = raw_pred  (already absolute)
    """
    if target_mode == "price_change":
        return current_prices + raw_preds
    if target_mode == "next_day_return":
        return current_prices * (1.0 + raw_preds)
    return raw_preds


# ---------------------------------------------------------------------------
# Feature engineering (mirrors train_model.py — no shared state with it)
# ---------------------------------------------------------------------------

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Apply rich technical and sentiment feature engineering.
    All computations are purely backward-looking — no future information leaks.
    """
    # --- Downside pressure flags ---
    df["neg_tone_flag"]   = (df["avg_tone"] < 0).astype(int)
    df["strong_neg_tone"] = (df["avg_tone"] < -0.5).astype(int)

    # --- Volatility spike flag ---
    if "volatility_5" in df.columns:
        df["volatility_spike"] = (
            df["volatility_5"] > df["volatility_5"].rolling(5).mean()
        ).astype(int)

    # --- Price momentum features ---
    if "price_lag_1" in df.columns:
        df["down_momentum"] = (df["price"] < df["price_lag_1"]).astype(int)
    if "price_lag_1" in df.columns:
        df["price_diff_1"] = df["price"] - df["price_lag_1"]
    if "price_lag_1" in df.columns and "price_lag_2" in df.columns:
        df["price_diff_2"] = df["price_lag_1"] - df["price_lag_2"]

    # --- Ensure return columns exist ---
    if "return_1" not in df.columns:
        df["return_1"] = df["price"].pct_change(1)
    if "return_2" not in df.columns:
        df["return_2"] = df["price"].pct_change(2)
    if "return_3" not in df.columns:
        df["return_3"] = df["price"].pct_change(3)
    if "return_5" not in df.columns:
        df["return_5"] = df["price"].pct_change(5)
    if "return_10" not in df.columns:
        df["return_10"] = df["price"].pct_change(10)

    # --- Ensure rolling MA / volatility columns exist ---
    if "price_ma_3" not in df.columns:
        df["price_ma_3"] = df["price"].rolling(3).mean()
    if "price_ma_5" not in df.columns:
        df["price_ma_5"] = df["price"].rolling(5).mean()
    if "price_ma_10" not in df.columns:
        df["price_ma_10"] = df["price"].rolling(10).mean()
    if "price_ma_20" not in df.columns:
        df["price_ma_20"] = df["price"].rolling(20).mean()
    if "volatility_5" not in df.columns:
        df["volatility_5"] = df["return_1"].rolling(5).std()
    if "volatility_10" not in df.columns:
        df["volatility_10"] = df["return_1"].rolling(10).std()
    if "volatility_20" not in df.columns:
        df["volatility_20"] = df["return_1"].rolling(20).std()

    # --- Sentiment rolling features ---
    df["tone_ma_3"]  = df["avg_tone"].rolling(3).mean()
    df["tone_x_volatility"] = df["avg_tone"] * df["volatility_5"]
    if "tone_ma_5" not in df.columns:
        df["tone_ma_5"]  = df["avg_tone"].rolling(5).mean()
    if "tone_ma_10" not in df.columns:
        df["tone_ma_10"] = df["avg_tone"].rolling(10).mean()

    # --- Trend and acceleration ---
    df["trend_strength"] = df["price_ma_3"] - df["price_ma_5"]
    df["trend_10"]       = df["price_ma_5"] - df["price_ma_10"]
    df["acceleration"]   = df["return_1"] - df["return_2"]

    # --- Sentiment change ---
    df["tone_change"] = df["avg_tone"] - df["avg_tone"].shift(1)

    # --- 3-period and 5-period momentum (price units) ---
    if "price_lag_2" in df.columns:
        df["momentum_3"] = df["price"] - df["price_lag_2"]
    if "price_lag_4" in df.columns:
        df["momentum_5"] = df["price"] - df["price_lag_4"]
    elif "price_lag_2" in df.columns:
        df["momentum_5"] = df["price"].diff(4)

    # --- Price position relative to moving averages (stationary ratios) ---
    df["price_vs_ma5"]  = df["price"] / df["price_ma_5"] - 1
    df["ma3_vs_ma5"]    = df["price_ma_3"] / df["price_ma_5"] - 1
    df["price_vs_ma10"] = df["price"] / df["price_ma_10"] - 1
    df["price_vs_ma20"] = df["price"] / df["price_ma_20"] - 1

    # --- Bollinger Bands (20-day) ---
    _bb_std = df["price"].rolling(20).std()
    df["bb_upper"]    = df["price_ma_20"] + 2 * _bb_std
    df["bb_lower"]    = df["price_ma_20"] - 2 * _bb_std
    df["bb_width"]    = (df["bb_upper"] - df["bb_lower"]) / df["price_ma_20"]
    df["bb_position"] = (df["price"] - df["bb_lower"]) / (df["bb_upper"] - df["bb_lower"] + 1e-9)

    # --- EWM-based indicators (no NaN row loss) ---

    # MACD
    _ema12           = df["price"].ewm(span=12, adjust=False).mean()
    _ema26           = df["price"].ewm(span=26, adjust=False).mean()
    df["macd"]        = _ema12 - _ema26
    df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean()
    df["macd_hist"]   = df["macd"] - df["macd_signal"]
    df["price_vs_ema12"] = _ema12 / df["price"] - 1
    df["ema12_vs_ema26"] = _ema12 / _ema26 - 1

    # RSI (Wilder EWM smoothing)
    _delta    = df["price"].diff()
    _avg_gain = _delta.clip(lower=0).ewm(com=13, adjust=False).mean()
    _avg_loss = (-_delta.clip(upper=0)).ewm(com=13, adjust=False).mean()
    df["rsi"]          = 100 - (100 / (1 + _avg_gain / _avg_loss.replace(0, float("nan"))))
    df["rsi_norm"]     = (df["rsi"] - 50) / 50   # centred on 0
    df["rsi_overbought"] = (df["rsi"] > 70).astype(int)
    df["rsi_oversold"]   = (df["rsi"] < 30).astype(int)

    # Stochastic oscillator (14-day) — %K
    _lo14 = df["price"].rolling(14).min()
    _hi14 = df["price"].rolling(14).max()
    df["stoch_k"] = 100 * (df["price"] - _lo14) / (_hi14 - _lo14 + 1e-9)
    df["stoch_d"] = df["stoch_k"].rolling(3).mean()

    # --- Cyclical calendar encoding ---
    df["date"] = pd.to_datetime(df["date"])
    df["month_sin"] = df["date"].dt.month.apply(lambda m: math.sin(2 * math.pi * m / 12))
    df["month_cos"] = df["date"].dt.month.apply(lambda m: math.cos(2 * math.pi * m / 12))

    # Day-of-week (0=Mon … 4=Fri) — oil markets exhibit weekly seasonality
    if "dow_sin" not in df.columns:
        _dow = df["date"].dt.dayofweek
        df["dow_sin"] = _dow.apply(lambda d: math.sin(2 * math.pi * d / 5))
        df["dow_cos"] = _dow.apply(lambda d: math.cos(2 * math.pi * d / 5))

    # --- Sentiment × technical interaction features ---
    df["macd_x_tone"] = df["macd_hist"] * df["avg_tone"]
    df["rsi_x_tone"]  = df["rsi_norm"]  * df["avg_tone"]
    df["macd_x_vol"]  = df["macd_hist"] * df["volatility_5"]
    df["rsi_x_vol"]   = df["rsi_norm"]  * df["volatility_5"]

    # --- Commodity dummy (WTI=1, BRENT=0) ---
    if "commodity" in df.columns:
        df["is_wti"] = (df["commodity"] == "WTI").astype(int)

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
        choices=["next_price", "price_change", "next_day_return", "future_price_3"],
        help=(
            "Regression target.  "
            "'next_price'      = absolute price of next trading day (original, default).  "
            "'price_change'    = Δprice (next−current); evaluated on reconstructed abs price.  "
            "'next_day_return' = %% return; evaluated on reconstructed abs price.  "
            "'future_price_3'  = absolute price 3 periods ahead.  "
            "Recommended for improved R²: --target price_change"
        ),
    )
    args = parser.parse_args()

    # ------------------------------------------------------------------
    # 1. Load data
    # ------------------------------------------------------------------
    # Prefer the daily-frequency table (built by scripts/build_daily_training_table.py)
    # which has ~7× more rows than the weekly-aggregated table.  Fall back to the
    # original table so the script still works in environments that haven't regenerated
    # the data.  The direction model (prediction_model.joblib) uses the original
    # model_training_table.parquet and is never affected by this choice.
    daily_path = "data/processed/daily_training_table.parquet"
    weekly_path = "data/processed/model_training_table.parquet"
    if os.path.exists(daily_path):
        parquet_path = daily_path
        log.info("Using daily training table: %s", parquet_path)
    elif os.path.exists(weekly_path):
        parquet_path = weekly_path
        log.warning(
            "Daily training table not found; falling back to %s.  "
            "Run scripts/build_daily_training_table.py for better performance.",
            parquet_path,
        )
    else:
        raise FileNotFoundError(
            f"No training data found at '{daily_path}' or '{weekly_path}'.  "
            "Run scripts/build_daily_training_table.py first."
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
        target_col = "next_price"
        log.info("Target: next_price (absolute price of next trading day)")

    elif args.target == "price_change":
        df["price_change"] = df["next_price"] - df["price"]
        target_col = "price_change"
        log.info(
            "Target: price_change (Δprice = next_price − price); "
            "all metrics shown on reconstructed absolute price"
        )

    elif args.target == "next_day_return":
        if "next_day_return" not in df.columns:
            raise KeyError(
                "'next_day_return' column not found in parquet — "
                "re-run scripts/build_training_table.py"
            )
        target_col = "next_day_return"
        log.info(
            "Target: next_day_return (%% return); "
            "all metrics shown on reconstructed absolute price"
        )

    else:  # future_price_3
        df["future_price_3"] = df.groupby("commodity")["price"].shift(-3)
        target_col = "future_price_3"
        log.info("Target: future_price_3 (absolute price 3 periods ahead)")

    # Drop rows where the target is NaN (tail of each commodity series).
    df = drop_nan_with_log(df, subset=[target_col], stage="target-NaN removal")

    log.info(
        "Target '%s' stats — min: %.4f, max: %.4f, mean: %.4f, std: %.4f",
        target_col,
        df[target_col].min(), df[target_col].max(),
        df[target_col].mean(), df[target_col].std(),
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
        "price_change",     # derived from next_price (excluded if computed)
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

    # 'price' column is in X as a feature and also used here to reconstruct
    # absolute prices from change/return predictions and for the LastPrice baseline.
    price_series = X["price"].values

    # ------------------------------------------------------------------
    # 5. Time-series cross-validation (5 folds)
    #    TimeSeriesSplit ensures training data always precedes test data,
    #    respecting the temporal ordering of oil-price observations.
    # ------------------------------------------------------------------
    tscv = TimeSeriesSplit(n_splits=5)

    # Define all candidate models.  Linear models (Ridge/Lasso/ElasticNet) use
    # StandardScaler internally; tree models work on raw features.
    # make_models() is a closure so LassoCV/ElasticNetCV can use cv=3 (a simple
    # integer) to avoid over-splitting the small per-fold training sets.
    def make_models():
        candidates = {
            "Ridge": RidgeCV(
                alphas=[0.0001, 0.001, 0.01, 0.1, 1, 10, 100, 1000, 10000],
            ),
            "Lasso": LassoCV(
                alphas=[0.0001, 0.001, 0.01, 0.1, 1, 10],
                cv=3,
                max_iter=10000,
            ),
            "ElasticNet": ElasticNetCV(
                l1_ratio=[0.1, 0.3, 0.5, 0.7, 0.9, 0.95, 1.0],
                alphas=[0.0001, 0.001, 0.01, 0.1, 1, 10],
                cv=3,
                max_iter=10000,
            ),
            # Huber regression — robust to large oil-price outlier days
            "Huber": HuberRegressor(
                epsilon=1.35,
                alpha=0.01,
                max_iter=300,
            ),
            "RandomForest": RandomForestRegressor(
                n_estimators=500,
                max_depth=5,
                min_samples_leaf=5,
                max_features=0.4,
                random_state=42,
                n_jobs=-1,
            ),
            "GradientBoosting": GradientBoostingRegressor(
                n_estimators=300,
                learning_rate=0.03,
                max_depth=3,
                min_samples_leaf=5,
                subsample=0.8,
                max_features=0.5,
                random_state=42,
            ),
            # HistGradientBoosting — fast, handles NaN natively, great with many features
            "HistGBM": HistGradientBoostingRegressor(
                max_iter=300,
                learning_rate=0.03,
                max_depth=4,
                min_samples_leaf=10,
                l2_regularization=1.0,
                random_state=42,
            ),
        }
        if XGBOOST_AVAILABLE:
            candidates["XGBoost"] = XGBRegressor(
                n_estimators=300,
                learning_rate=0.03,
                max_depth=3,
                min_child_weight=5,
                subsample=0.8,
                colsample_bytree=0.6,
                reg_alpha=0.1,
                reg_lambda=2.0,
                random_state=42,
                verbosity=0,
                n_jobs=-1,
            )
        else:
            log.warning("XGBoost not installed — skipping XGBRegressor.")

        if LIGHTGBM_AVAILABLE:
            candidates["LightGBM"] = LGBMRegressor(
                n_estimators=300,
                learning_rate=0.03,
                max_depth=4,
                num_leaves=20,
                min_child_samples=15,
                subsample=0.8,
                colsample_bytree=0.6,
                reg_alpha=0.1,
                reg_lambda=2.0,
                random_state=42,
                verbosity=-1,
                n_jobs=-1,
            )
        else:
            log.warning("LightGBM not installed — skipping LGBMRegressor.")

        # Stacking: best linear + best tree models → Ridge meta-learner
        stack_base = [
            ("ridge", make_pipeline(
                StandardScaler(),
                RidgeCV(alphas=[0.01, 0.1, 1, 10, 100]),
            )),
            ("histgbm", HistGradientBoostingRegressor(
                max_iter=200, learning_rate=0.05, max_depth=3,
                min_samples_leaf=10, l2_regularization=1.0, random_state=42,
            )),
        ]
        if LIGHTGBM_AVAILABLE:
            stack_base.append(("lgbm", LGBMRegressor(
                n_estimators=200, learning_rate=0.05, max_depth=3,
                num_leaves=15, min_child_samples=15, subsample=0.8,
                colsample_bytree=0.6, reg_alpha=0.1, reg_lambda=2.0,
                random_state=42, verbosity=-1, n_jobs=-1,
            )))
        elif XGBOOST_AVAILABLE:
            stack_base.append(("xgb", XGBRegressor(
                n_estimators=200, learning_rate=0.05, max_depth=3,
                subsample=0.8, colsample_bytree=0.6, random_state=42,
                verbosity=0, n_jobs=-1,
            )))
        candidates["Stacking"] = StackingRegressor(
            estimators=stack_base,
            final_estimator=RidgeCV(alphas=[0.01, 0.1, 1, 10, 100]),
            cv=3,
            n_jobs=1,  # avoid nested parallelism issues
        )

        return candidates

    model_names = list(make_models().keys())
    # ALL_NAMES includes "LastPrice" (naïve random-walk baseline) first.
    ALL_NAMES = ["LastPrice"] + model_names
    cv_results = {name: [] for name in ALL_NAMES}

    log.info("Starting %d-fold time-series cross-validation...", tscv.n_splits)
    log.info("Models: %s", ALL_NAMES)

    for fold, (train_idx, test_idx) in enumerate(tscv.split(X), start=1):
        X_tr, X_te = X.iloc[train_idx].values, X.iloc[test_idx].values
        y_tr, y_te = y[train_idx], y[test_idx]

        # Current prices for the test fold — used for reconstruction and
        # the LastPrice (naïve random-walk) baseline.
        price_te = price_series[test_idx]

        # Actual next prices in absolute $/bbl for all metric computations.
        y_te_abs = reconstruct_price(y_te, price_te, args.target)

        # --- LastPrice baseline: predict tomorrow = today ---
        last_metrics = regression_metrics(y_te_abs, price_te)
        cv_results["LastPrice"].append(last_metrics)
        log.info(
            "  Fold %d | %-18s | MAE=%.3f  RMSE=%.3f  MAPE=%.2f%%  R²=%.4f  [baseline]",
            fold, "LastPrice",
            last_metrics["MAE"], last_metrics["RMSE"],
            last_metrics["MAPE (%)"], last_metrics["R²"],
        )

        for name, mdl in make_models().items():
            if name in LINEAR_MODELS:
                sc = StandardScaler()
                X_tr_fit = sc.fit_transform(X_tr)
                X_te_fit = sc.transform(X_te)
            else:
                X_tr_fit, X_te_fit = X_tr, X_te

            mdl.fit(X_tr_fit, y_tr)
            preds_abs = reconstruct_price(mdl.predict(X_te_fit), price_te, args.target)
            metrics = regression_metrics(y_te_abs, preds_abs)
            cv_results[name].append(metrics)
            log.info(
                "  Fold %d | %-18s | MAE=%.3f  RMSE=%.3f  MAPE=%.2f%%  R²=%.4f",
                fold, name, metrics["MAE"], metrics["RMSE"],
                metrics["MAPE (%)"], metrics["R²"],
            )

    # Aggregate CV results (mean across folds).
    log.info("\nCross-validation summary (mean across %d folds):", tscv.n_splits)
    cv_summary = {}
    for name in ALL_NAMES:
        folds_data = cv_results[name]
        cv_summary[name] = {
            k: float(np.mean([f[k] for f in folds_data]))
            for k in folds_data[0]
        }
        suffix = "  [baseline]" if name == "LastPrice" else ""
        log.info(
            "  %-18s | MAE=%.3f  RMSE=%.3f  MAPE=%.2f%%  R²=%.4f%s",
            name,
            cv_summary[name]["MAE"],
            cv_summary[name]["RMSE"],
            cv_summary[name]["MAPE (%)"],
            cv_summary[name]["R²"],
            suffix,
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
    price_test = price_series[last_test_idx]

    # Actual next prices in absolute $/bbl for holdout evaluation.
    y_test_abs = reconstruct_price(y_test, price_test, args.target)

    # Use label-based index lookup so dates remain correct even when the
    # post-feature-engineering NaN removal dropped rows from the front.
    test_dates = df.loc[X.index[last_test_idx], "date"].values

    log.info(
        "Final holdout — train: %d rows, test: %d rows",
        len(y_train), len(y_test),
    )

    holdout_results = {}
    trained_models  = {}
    scalers         = {}

    # --- LastPrice baseline ---
    holdout_results["LastPrice"] = {
        **regression_metrics(y_test_abs, price_test),
        "predictions_abs": price_test,
    }
    log.info(
        "  Holdout %-18s | MAE=%.3f  RMSE=%.3f  MAPE=%.2f%%  R²=%.4f  [baseline]",
        "LastPrice",
        holdout_results["LastPrice"]["MAE"],
        holdout_results["LastPrice"]["RMSE"],
        holdout_results["LastPrice"]["MAPE (%)"],
        holdout_results["LastPrice"]["R²"],
    )

    for name, mdl in make_models().items():
        if name in LINEAR_MODELS:
            sc = StandardScaler()
            X_tr_fit = sc.fit_transform(X_train)
            X_te_fit = sc.transform(X_test)
            scalers[name] = sc
        else:
            X_tr_fit, X_te_fit = X_train, X_test

        mdl.fit(X_tr_fit, y_train)
        preds_abs = reconstruct_price(mdl.predict(X_te_fit), price_test, args.target)
        metrics = regression_metrics(y_test_abs, preds_abs)
        holdout_results[name] = {**metrics, "predictions_abs": preds_abs}
        trained_models[name]  = mdl
        log.info(
            "  Holdout %-18s | MAE=%.3f  RMSE=%.3f  MAPE=%.2f%%  R²=%.4f",
            name, metrics["MAE"], metrics["RMSE"],
            metrics["MAPE (%)"], metrics["R²"],
        )

    # ------------------------------------------------------------------
    # 7. Print comparison table
    # ------------------------------------------------------------------
    baseline_mae  = holdout_results["LastPrice"]["MAE"]
    baseline_rmse = holdout_results["LastPrice"]["RMSE"]
    print("\n" + "=" * 90)
    print("PRICE FORECAST ENGINE — MODEL COMPARISON  (all metrics on reconstructed $/bbl)")
    print(f"Target mode: {args.target}  |  Holdout size: {len(y_test)} rows")
    print("=" * 90)
    header = (
        f"{'Model':<20} {'MAE':>8} {'RMSE':>8} {'MAPE (%)':>10} {'R²':>8}  "
        f"MAE vs BL  RMSE vs BL"
    )
    print(header)
    print("-" * 90)
    for name in ALL_NAMES:
        m = holdout_results[name]
        if name == "LastPrice":
            flags = "  ← naïve random-walk baseline"
        else:
            d_mae  = m["MAE"]  - baseline_mae
            d_rmse = m["RMSE"] - baseline_rmse
            mae_sym  = "✅" if d_mae  < 0 else "  "
            rmse_sym = "✅" if d_rmse < 0 else "  "
            flags = f"  {mae_sym}{d_mae:+.3f}    {rmse_sym}{d_rmse:+.3f}"
        print(
            f"{name:<20} {m['MAE']:>8.3f} {m['RMSE']:>8.3f} "
            f"{m['MAPE (%)']:>10.2f} {m['R²']:>8.4f}{flags}"
        )
    print("=" * 90)

    # ------------------------------------------------------------------
    # 8. Select best model by lowest RMSE on the holdout set
    #    (RMSE penalises large mis-predictions more, which is appropriate
    #    for an oil-price forecasting use-case. LastPrice is excluded —
    #    it is only a reference baseline.)
    # ------------------------------------------------------------------
    best_name = min(
        model_names,
        key=lambda n: holdout_results[n]["RMSE"],
    )
    best_metrics  = holdout_results[best_name]
    best_model    = trained_models[best_name]
    best_preds    = best_metrics["predictions_abs"]   # always in $/bbl

    beats_mae  = best_metrics["MAE"]  < baseline_mae
    beats_rmse = best_metrics["RMSE"] < baseline_rmse
    beats_any  = beats_mae or beats_rmse
    print(f"\n{'✅' if beats_any else '⚠️ '} Best model (by RMSE): {best_name}")
    print(
        f"   MAE={best_metrics['MAE']:.3f}  "
        f"RMSE={best_metrics['RMSE']:.3f}  "
        f"MAPE={best_metrics['MAPE (%)']:.2f}%  "
        f"R²={best_metrics['R²']:.4f}"
    )
    if beats_rmse:
        print(f"   ✅ Beats random-walk baseline on RMSE "
              f"({best_metrics['RMSE']:.3f} < {baseline_rmse:.3f})")
    if beats_mae:
        print(f"   ✅ Beats random-walk baseline on MAE "
              f"({best_metrics['MAE']:.3f} < {baseline_mae:.3f})")
    if not beats_any:
        print(
            f"   ⚠️  No model beat the LastPrice baseline "
            f"(MAE={baseline_mae:.3f}, RMSE={baseline_rmse:.3f}).  "
            "Consider collecting more data."
        )

    # ------------------------------------------------------------------
    # 9. Save the best model
    #    IMPORTANT: we write to 'price_forecast_model.joblib' only.
    #    'prediction_model.joblib' (the classifier) is never touched.
    # ------------------------------------------------------------------
    os.makedirs("models", exist_ok=True)
    model_save_path = "models/price_forecast_model.joblib"

    save_bundle = {
        "model": best_model,
        "features": X.columns.tolist(),
        "target": args.target,
        "target_col": target_col,
    }
    if best_name in LINEAR_MODELS and best_name in scalers:
        save_bundle["scaler"] = scalers[best_name]
        log.info("StandardScaler included in saved bundle for '%s'.", best_name)

    joblib.dump(save_bundle, model_save_path)
    log.info("Best model ('%s') saved to %s", best_name, model_save_path)

    # Confirm classifier is untouched.
    if os.path.exists("models/prediction_model.joblib"):
        log.info("✅ Direction Signal Engine (models/prediction_model.joblib) is untouched.")
    else:
        log.warning("models/prediction_model.joblib not found — was it already missing?")

    # ------------------------------------------------------------------
    # 10. Build and save the holdout predictions CSV
    #     All prices are in absolute $/bbl regardless of target mode.
    # ------------------------------------------------------------------
    actual_prices    = y_test_abs          # actual next prices ($/bbl)
    predicted_prices = best_preds          # reconstructed absolute predictions
    errors           = np.abs(actual_prices - predicted_prices)
    pct_errors       = np.where(
        actual_prices != 0,
        (errors / np.abs(actual_prices)) * 100,
        np.nan,
    )

    predictions_df = pd.DataFrame({
        "Date":            pd.to_datetime(test_dates).strftime("%Y-%m-%d"),
        "Actual Price":    np.round(actual_prices, 2),
        "Predicted Price": np.round(predicted_prices, 2),
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
