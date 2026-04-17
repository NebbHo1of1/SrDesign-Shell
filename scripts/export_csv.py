#!/usr/bin/env python3
"""Export SIGNAL SQLite tables to CSV for Power BI / Excel.

Run from the project root:
    python3 scripts/export_csv.py

The CSVs are written to the current working directory.
"""

import csv
import sqlite3
import os
import sys

DB_PATH = os.path.join("backend", "data.db")

if not os.path.exists(DB_PATH):
    print(f"Error: database not found at {DB_PATH}")
    print("Make sure you run this from the project root (SrDesign-Shell/).")
    sys.exit(1)

conn = sqlite3.connect(DB_PATH)

for table in ["headlines", "price_points"]:
    cur = conn.execute(f"SELECT * FROM {table}")  # noqa: S608
    cols = [d[0] for d in cur.description]
    out_file = f"{table}_export.csv"
    with open(out_file, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(cols)
        writer.writerows(cur.fetchall())
    row_count = conn.execute(f"SELECT count(*) FROM {table}").fetchone()[0]  # noqa: S608
    print(f"  ✓ {out_file}  ({row_count} rows)")

conn.close()
print(f"\nFiles saved in: {os.getcwd()}")
