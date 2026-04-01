import os
import requests
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

EIA_API_KEY = os.getenv("EIA_API_KEY")
if not EIA_API_KEY:
    raise ValueError("EIA_API_KEY not found in .env")

BASE_URL = "https://api.eia.gov/v2/petroleum/pri/spt/data/"

def fetch_rows(offset=0, length=5000):
    params = {
        "api_key": EIA_API_KEY,
        "data[0]": "value",
        "frequency": "daily",
        "offset": offset,
        "length": length,
        "sort[0][column]": "period",
        "sort[0][direction]": "desc",
    }
    r = requests.get(BASE_URL, params=params, timeout=30)
    r.raise_for_status()
    return r.json()

def get_wti_rows(max_pages=10):
    matches = []
    offset = 0
    length = 5000

    for page in range(max_pages):
        print(f"Checking page {page + 1}...")
        data = fetch_rows(offset=offset, length=length)
        rows = data.get("response", {}).get("data", [])
        if not rows:
            break

        df = pd.DataFrame(rows)

        mask = (
            df["series-description"].astype(str).str.contains(
                "WTI - Cushing, Oklahoma|Cushing, Oklahoma WTI|WTI",
                case=False,
                na=False
            )
        ) | (
            df["product-name"].astype(str).str.contains("Crude Oil", case=False, na=False)
            & df["area-name"].astype(str).str.contains("Cushing|Oklahoma", case=False, na=False)
        )

        found = df.loc[mask].copy()
        if not found.empty:
            print("Found possible WTI rows:")
            print(found[["period", "series", "series-description", "value", "units"]].head(10).to_string())
            matches.append(found)

        if len(rows) < length:
            break

        offset += length

    if not matches:
        return pd.DataFrame()

    return pd.concat(matches, ignore_index=True)

def main():
    df = get_wti_rows(max_pages=12)

    if df.empty:
        print("No WTI rows found.")
        return

    df["date"] = pd.to_datetime(df["period"], errors="coerce")
    df["price"] = pd.to_numeric(df["value"], errors="coerce")
    df["commodity"] = "WTI"

    df = df[["date", "commodity", "price"]].dropna()
    df = df.sort_values("date").drop_duplicates(subset=["date", "commodity"], keep="last")

    os.makedirs("data/processed", exist_ok=True)
    output_path = "data/processed/price_history.parquet"
    df.to_parquet(output_path, index=False)

    print(f"Saved to {output_path}")
    print(df.head())
    print(df.tail())
    print(f"Rows saved: {len(df)}")

if __name__ == "__main__":
    main()
