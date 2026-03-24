from datetime import datetime
import sqlite3

import pandas as pd
import yfinance as yf


DB_PATH = "backend/data.db"

# Yahoo Finance tickers
TICKERS = {
    "WTI": "CL=F",
    "BRENT": "BZ=F",
    "HENRY_HUB": "NG=F",
}


def create_pricepoint_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS pricepoint (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            commodity TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            close REAL NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS idx_pricepoint_unique
        ON pricepoint (commodity, timestamp)
        """
    )
    conn.commit()


def download_prices(ticker: str, period: str = "60d", interval: str = "1h") -> pd.DataFrame:
    df = yf.download(ticker, period=period, interval=interval, auto_adjust=False, progress=False)

    if df.empty:
        raise ValueError(f"No data returned for ticker {ticker}")

    df = df.reset_index()

    # yfinance sometimes uses Datetime, sometimes Date
    if "Datetime" in df.columns:
        df["timestamp"] = pd.to_datetime(df["Datetime"], utc=True)
    elif "Date" in df.columns:
        df["timestamp"] = pd.to_datetime(df["Date"], utc=True)
    else:
        raise ValueError("Downloaded data does not contain Datetime or Date column.")

    if "Close" not in df.columns:
        raise ValueError("Downloaded data does not contain Close column.")

    df = df[["timestamp", "Close"]].dropna()
    df = df.rename(columns={"Close": "close"})
    return df


def insert_prices(conn: sqlite3.Connection, commodity: str, df: pd.DataFrame) -> int:
    inserted = 0

    for _, row in df.iterrows():
        timestamp_str = str(pd.to_datetime(row["timestamp"]))
        close_price = float(row["close"])

        cur = conn.execute(
            """
            INSERT OR IGNORE INTO pricepoint (commodity, timestamp, close)
            VALUES (?, ?, ?)
            """,
            (commodity, timestamp_str, close_price),
        )
        inserted += cur.rowcount

    conn.commit()
    return inserted


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    create_pricepoint_table(conn)

    total_inserted = 0

    for commodity, ticker in TICKERS.items():
        print(f"Downloading {commodity} from {ticker}...")
        df = download_prices(ticker)
        added = insert_prices(conn, commodity, df)
        total_inserted += added
        print(f"Inserted {added} rows for {commodity}")

    conn.close()
    print(f"Done. Total new rows inserted: {total_inserted}")


if __name__ == "__main__":
    main()

