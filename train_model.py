import os
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
from sklearn.model_selection import train_test_split

def main():
    parquet_path = "data/processed/model_training_table.parquet"

    if not os.path.exists(parquet_path):
        raise FileNotFoundError(f"Could not find {parquet_path}")

    df = pd.read_parquet(parquet_path)
    print(f"Dataset loaded: {df.shape[0]} rows, {df.shape[1]} columns")
    print(f"Columns: {df.columns.tolist()}")
    
    # Check for missing values
    print(f"\nMissing values:\n{df.isna().sum()}")
    
    # Drop rows with missing target
    df = df.dropna(subset=["target_up_down"])
    
    # Prepare features and target
    X = df.drop("target_up_down", axis=1)
    y = df["target_up_down"]
    
    print(f"\nFeatures shape: {X.shape}")
    print(f"Target distribution:\n{y.value_counts()}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Train model
    model = RandomForestClassifier(n_estimators=100, random_state=42)
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
    
    # Save model
    os.makedirs("models", exist_ok=True)
    joblib.dump(model, "models/prediction_model.joblib")
    
    print("\nModel saved to models/prediction_model.joblib")


if __name__ == "__main__":
    main()