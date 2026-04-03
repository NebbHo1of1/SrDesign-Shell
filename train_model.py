import os
import joblib
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import classification_report, accuracy_score
from sklearn.model_selection import train_test_split

def main():
    parquet_path = "data/processed/model_training_table.parquet"

    if not os.path.exists(parquet_path):
        raise FileNotFoundError(f"Could not find {parquet_path}")

    df = pd.read_parquet(parquet_path)

    
    (Improved model: removed leakage, added feature engineering, switched to Gradient Boosting)
    # Add engineered features
    df["price_diff_1"] = df["price"] - df["price_lag_1"]
    df["price_diff_2"] = df["price_lag_1"] - df["price_lag_2"]
    df["tone_ma_3"] = df["avg_tone"].rolling(3).mean()
    df["tone_x_volatility"] = df["avg_tone"] * df["volatility_5"]

    (Improved model: removed leakage, added feature engineering, switched to Gradient Boosting)
    print(f"Dataset loaded: {df.shape[0]} rows, {df.shape[1]} columns")
    print(f"Columns: {df.columns.tolist()}")
    
    # Check for missing values
    print(f"\nMissing values:\n{df.isna().sum()}")
    
    # Drop rows with missing target
    df = df.dropna(subset=["target_up_down"])

    # Drop rows with NaNs created by rolling features
    df = df.dropna()
    
    # Prepare features and target
    y = df["target_up_down"]
    
    # Keep only numeric columns, then remove target leakage columns
    X = df.select_dtypes(include=["number"]).drop(
        columns=["target_up_down", "next_price", "next_day_return"],
        errors="ignore"
    )
    


    # Drow rows with NaNsfrom feature engineering
    df = df.dropna()

    # Prepare features and target
    y = df["target_up_down"]

    # Keep only numeric columns, then remove target leakage columns
    X = df.select_dtypes(include=["number"]).drop(
    columns=["target_up_down", "next_price", "next_day_return"],
    errors="ignore"
    ) 

    (Improved model: removed leakage, added feature engineering, switched to Gradient Boosting)
    print("\nFINAL FEATURES USED:")
    print(X.columns.tolist())
    
    print(f"\nFeatures shape after dropping non-numeric: {X.shape}")
    print(f"Numeric columns: {X.columns.tolist()}")
    print(f"Target distribution:\n{y.value_counts()}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Train model
    model = GradientBoostingClassifier(random_state=42)
    print("\nTraining model...")
    model.fit(X_train, y_train)
    
    # Evaluate
    preds = model.predict(X_test)
    
    print("\n" + "="*50)
    print("MODEL PERFORMANCE")
    print("="*50)
    print("Accuracy:", round(accuracy_score(y_test, preds), 4))
    print("\nClassification Report:\n")
    print(classification_report(y_test, preds))
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': X.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\nTop 5 Most Important Features:")
    print(feature_importance.head())
    
    # Save model
    os.makedirs("models", exist_ok=True)
    joblib.dump(model, "models/prediction_model.joblib")
    
    print("\nModel saved to models/prediction_model.joblib")


if __name__ == "__main__":
    main()
