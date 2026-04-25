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
  /** AI model prediction: "UP" | "DOWN" | "UNCERTAIN" | null */
  model_prediction: string | null;
  /** AI model confidence (0-1) */
  model_confidence: number | null;
  /** AI model raw P(UP) */
  model_probability_up: number | null;
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
  /* Price Forecast Model metrics (added by train_price_model.py) */
  price_model_type?: string;
  price_rmse?: number;
  price_mae?: number;
  price_r2?: number;
  price_mape?: number;
  baseline_rmse?: number;
  baseline_mae?: number;
  baseline_r2?: number;
  all_price_models?: Array<{
    name: string;
    rmse: number;
    mae: number;
    r2: number;
    mape?: number | null;
    deployed: boolean;
    is_baseline?: boolean;
  }>;
}

export interface PredictionHistoryPoint {
  date: string;
  dominant_prediction: "UP" | "DOWN";
  avg_confidence: number;
  avg_sentiment: number;
  headline_count: number;
  up_count: number;
  down_count: number;
}

export interface HoldoutPoint {
  date: string;
  actual: number;
  predicted: number;
  baseline: number;
}

/* ── Fetcher ─────────────────────────────────────────────────────────── */

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  let res: Response;
  try {
    res = await fetch(url.toString(), { cache: "no-store" });
  } catch (err) {
    const msg =
      err instanceof TypeError
        ? `Cannot reach API at ${API} — is the backend running?`
        : `Network error: ${String(err)}`;
    console.debug(`[SIGNAL API] ${msg}`);
    throw new Error(msg);
  }
  if (!res.ok) {
    const msg = `API ${res.status}: ${res.statusText}`;
    console.warn(`[SIGNAL API] ${msg} — ${url.pathname}`);
    throw new Error(msg);
  }
  return res.json();
}

async function post<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { method: "POST", cache: "no-store" });
  } catch (err) {
    const msg =
      err instanceof TypeError
        ? `Cannot reach API at ${API} — is the backend running?`
        : `Network error: ${String(err)}`;
    throw new Error(msg);
  }
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }
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

  /** Fetch daily prediction history for charting model performance over time. */
  predictionHistory: (commodity = "WTI", limit = 30) =>
    get<PredictionHistoryPoint[]>("/prediction-history", { commodity, limit: String(limit) }),

  /** Fetch holdout test-set predictions for the Actual vs. Predicted chart. */
  holdoutPredictions: () => get<HoldoutPoint[]>("/holdout-predictions"),

  /** Trigger database seeding (creates synthetic data if real APIs are unavailable). */
  seed: () => post<{ status: string; headlines: number; price_points: number }>("/seed"),
};
