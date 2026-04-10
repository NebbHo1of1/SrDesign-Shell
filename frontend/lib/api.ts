/* ── Shell SIGNAL API Client ─────────────────────────────────────────
   Typed helpers for every FastAPI endpoint.
   All data flows through here — pages and components stay clean.
   ──────────────────────────────────────────────────────────────────── */

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

/* ── Types ───────────────────────────────────────────────────────────── */

export interface Headline {
  id: string;
  published_at: string;
  title: string;
  source: string;
  url: string;
  commodity: string;
  sentiment_score: number;
  event_type: string;
  impact_score: number;
  pred_label: "UP" | "DOWN" | "NEUTRAL";
  pred_confidence: number;
}

export interface PricePoint {
  timestamp: string;
  close: number;
}

export interface PriceSeries {
  commodity: string;
  points: PricePoint[];
}

export interface KPIs {
  avg_sentiment_24h: number;
  high_impact_count_24h: number;
  last_prediction: string | null;
  last_confidence: number | null;
  total_headlines_24h: number;
}

export interface SentimentPricePoint {
  published_at: string;
  title: string;
  sentiment_score: number;
  pred_label: string;
  next_price_change: number;
}

export interface ModelPrediction {
  prediction: "UP" | "DOWN" | "UNCERTAIN";
  confidence: number;
  probability_up: number;
  commodity: string;
  features_used: number;
  model_type: string;
  timestamp: string;
}

export interface ModelReport {
  model_type: string;
  n_estimators: number;
  threshold: number;
  test_accuracy: number;
  classification_metrics: {
    precision: number;
    recall: number;
    f1_score: number;
  };
  feature_count: number;
  training_samples: number;
  test_samples: number;
  feature_importances: Record<string, number>;
  all_features: string[];
}

/* ── Fetcher ─────────────────────────────────────────────────────────── */

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

/* ── Endpoints ───────────────────────────────────────────────────────── */

export const api = {
  health: () => get<{ status: string }>("/health"),

  headlines: (commodity = "WTI", limit = 50, since?: string) =>
    get<Headline[]>("/headlines", {
      commodity,
      limit: String(limit),
      ...(since ? { since } : {}),
    }),

  headline: (id: string) => get<Headline>(`/headlines/${id}`),

  prices: (commodity = "WTI", range = "7d") =>
    get<PriceSeries>("/prices", { commodity, range }),

  kpis: (commodity = "WTI") => get<KPIs>("/kpis", { commodity }),

  sentimentPrice: (commodity = "WTI") =>
    get<SentimentPricePoint[]>("/analytics/sentiment-price", { commodity }),

  /** Run the trained AI model and get a market-direction prediction. */
  predict: (commodity = "WTI") =>
    get<ModelPrediction>("/predict", { commodity }),

  /** Fetch the model training report (accuracy, features, etc.). */
  modelReport: () => get<ModelReport>("/model-report"),
};
