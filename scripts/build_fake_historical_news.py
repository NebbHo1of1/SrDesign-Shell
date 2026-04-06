import pandas as pd
import numpy as np
from datetime import datetime, timedelta

start_date = datetime(2018, 1, 1)
end_date = datetime(2026, 3, 30)

dates = pd.date_range(start_date, end_date)

data = []

for d in dates:
    article_count = np.random.randint(5, 50)
    avg_tone = np.random.uniform(-1, 1)

    data.append({
        "date": d,
        "commodity": "WTI",
        "article_count": article_count,
        "avg_tone": avg_tone
    })

df = pd.DataFrame(data)

df.to_parquet("data/processed/news_features.parquet", index=False)

print("Saved news_features.parquet")
print(df.head())

