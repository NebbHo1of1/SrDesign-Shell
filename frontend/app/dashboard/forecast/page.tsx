/* ── SIGNAL — Price Forecast Page ─────────────────────────────────────
   Price regression dashboard: confidence window, metric cards with plain-
   English subtitles, upgraded Actual vs. Predicted chart with error stats,
   feature importance chart, feature glossary, model architecture explainer,
   forecast pipeline, and model comparison table.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useEffect, useState, useMemo } from "react";
import {
  TrendingUp,
  AlertCircle,
  Gauge,
  ChevronDown,
  ChevronUp,
  Brain,
  BookOpen,
  GitBranch,
  Cpu,
  Database,
  DollarSign,
} from "lucide-react";
import RoleGate from "@/components/RoleGate";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { api, ModelReport, HoldoutPoint } from "@/lib/api";

const COMMODITIES = ["WTI", "BRENT"];

/* ── Feature glossary (price model) ───────────────────────────────── */
const PRICE_FEATURE_GLOSSARY: Record<string, string> = {
  price_lag_1:
    "Yesterday's closing oil price — the single most powerful predictor of tomorrow's price level due to strong price momentum.",
  price_lag_2:
    "Closing price from 2 days ago — combined with price_lag_1, reveals the very short-term price trend direction.",
  price_lag_3:
    "Closing price from 3 days ago — extends the recent history window the model uses to detect multi-day momentum.",
  price_ma_3:
    "3-day moving average — smooths out daily noise to reveal the short-term trend direction over 3 trading days.",
  price_ma_5:
    "5-day moving average (1-week baseline) — a standard reference level that traders use to judge if today's price is high or low.",
  return_1:
    "Yesterday's 1-day percentage return — captures daily price velocity and short-term momentum signals.",
  volatility_5:
    "Price volatility over the past 5 days — high values signal market uncertainty and can precede larger price swings.",
  tone_ma_3:
    "3-day rolling average of news sentiment scores — sustained positive or negative news shifts oil demand expectations.",
  avg_tone:
    "Today's average sentiment from oil-related headlines — captures the market's immediate reaction to new information.",
  rsi:
    "Relative Strength Index (0–100) — a momentum indicator: above 70 suggests overbought conditions, below 30 suggests oversold.",
  momentum_3:
    "Price change over the last 3 days — identifies whether the short-term price trend is accelerating or decelerating.",
  macd:
    "Moving Average Convergence Divergence — signals when short-term and long-term trend momentum are converging or diverging.",
  month_sin:
    "Cyclical encoding of the calendar month — captures seasonal demand patterns (summer driving season, winter heating, etc.).",
  is_wti:
    "Binary flag: 1 = WTI crude, 0 = Brent crude — lets the model learn the persistent price spread between the two benchmarks.",
  bb_position:
    "Bollinger Band position — where today's price sits within its recent trading range (0 = lower bound, 1 = upper bound).",
  bb_width:
    "Bollinger Band width — measures market volatility; wide bands signal high uncertainty, narrow bands signal consolidation.",
  price_vs_ma5:
    "Current price relative to its 5-day average — reveals whether the market is trending above or below recent norms.",
  ma3_vs_ma5:
    "Short-term (3-day) vs. medium-term (5-day) moving average ratio — a simple trend-crossover signal.",
  tone_x_volatility:
    "Interaction: sentiment score × price volatility — high-impact news during volatile periods has an amplified effect on price.",
};

/* ── Feature colour by category ───────────────────────────────────── */
function featureColor(name: string): string {
  const sentimentKeys = [
    "avg_tone", "tone_ma", "article_count", "macd_x_tone",
    "rsi_x_tone", "tone_x_vol", "tone_change", "neg_tone", "strong_neg_tone",
  ];
  const calendarKeys = ["month_sin", "month_cos", "dow_sin", "dow_cos", "is_wti"];
  const lowerName = name.toLowerCase();
  if (sentimentKeys.some((k) => lowerName.includes(k.toLowerCase()))) return "#A78BFA";
  if (calendarKeys.some((k) => lowerName.includes(k.toLowerCase()))) return "#FBCE07";
  return "#38BDF8";
}

/* ── Forecast pipeline steps ───────────────────────────────────────── */
const FORECAST_PIPELINE = [
  {
    step: 1,
    label: "Market Data",
    icon: Database,
    color: "#38BDF8",
    desc: "WTI & Brent closing prices: 10-day lags, 1–10-day returns, 3/5/10/20-day moving averages, 5/10/20-day volatility, Bollinger Bands, RSI, MACD, Stochastic oscillator.",
  },
  {
    step: 2,
    label: "News Signal",
    icon: TrendingUp,
    color: "#A78BFA",
    desc: "Sentiment scores & article volume from oil-related headlines: 3/5/10-day rolling tone averages, tone-change, and sentiment × volatility interaction features.",
  },
  {
    step: 3,
    label: "Stacking Ensemble",
    icon: Brain,
    color: "#FBCE07",
    desc: "Three base models (Ridge, HistGBM, LightGBM) each independently forecast tomorrow's price. A Ridge meta-learner then optimally blends the three predictions.",
  },
  {
    step: 4,
    label: "Price Output",
    icon: DollarSign,
    color: "#22C55E",
    desc: "Next-day $/bbl prediction with an RMSE-based confidence window (±$2.07/bbl at 1 RMSE). Beats the naïve random-walk baseline by 0.7% on RMSE.",
  },
] as const;

/* ── Architecture explainer steps ─────────────────────────────────── */
const ARCH_STEPS = [
  {
    step: 1,
    label: "Base Models",
    icon: Cpu,
    color: "#38BDF8",
    desc: "Three algorithms — Ridge Regression, Histogram Gradient Boosting, and LightGBM — each independently learn from the full feature set to predict tomorrow's oil price in $/bbl.",
  },
  {
    step: 2,
    label: "Meta-Learner",
    icon: GitBranch,
    color: "#A78BFA",
    desc: "A 4th model (Ridge Cross-Validation) acts as a blending layer. It learns the optimal weight for each base model's prediction, reducing the errors of any single model.",
  },
  {
    step: 3,
    label: "Final Prediction",
    icon: DollarSign,
    color: "#22C55E",
    desc: "The stacked ensemble outputs a single $/barrel price for the next trading day. The RMSE ($2.07/bbl) is used as the model's stated confidence interval.",
  },
] as const;

export default function ForecastPage() {
  const [commodity, setCommodity] = useState("WTI");
  const [report, setReport] = useState<ModelReport | null>(null);
  const [holdout, setHoldout] = useState<HoldoutPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const [hiddenLines, setHiddenLines] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .modelReport()
      .then(setReport)
      .catch((e: Error) => setError(e.message));
    api
      .holdoutPredictions()
      .then(setHoldout)
      .catch(() => {
        /* non-critical — chart will be hidden if no data */
      });
  }, []);

  /* Derive price forecast metrics */
  const priceRmse = report?.price_rmse;
  const priceMae = report?.price_mae;
  const priceR2 = report?.price_r2;
  const priceMape = report?.price_mape;
  const baselineRmse = report?.baseline_rmse;
  const baselineMae = report?.baseline_mae;
  const baselineR2 = report?.baseline_r2;
  const modelType = report?.price_model_type ?? "Regression";

  /* Beat-baseline improvement % */
  const rmsePctImprovement =
    priceRmse != null && baselineRmse != null && baselineRmse > 0
      ? (((baselineRmse - priceRmse) / baselineRmse) * 100).toFixed(1)
      : null;

  /* Error analysis stats computed from holdout data */
  const errorStats = useMemo(() => {
    if (holdout.length < 2) return null;
    const errors = holdout.map((h) => Math.abs(h.actual - h.predicted));
    const within2 = errors.filter((e) => e <= 2).length;
    const maxError = Math.max(...errors);
    const maxErrorIdx = errors.indexOf(maxError);
    const maxErrorDate = holdout[maxErrorIdx]?.date?.slice(0, 7) ?? "";
    /* Direction accuracy: did predicted move in same direction as actual? */
    let dirCorrect = 0;
    for (let i = 1; i < holdout.length; i++) {
      const actualUp = holdout[i].actual > holdout[i - 1].actual;
      const predUp = holdout[i].predicted > holdout[i - 1].predicted;
      if (actualUp === predUp) dirCorrect++;
    }
    return {
      within2Pct: ((within2 / holdout.length) * 100).toFixed(0),
      maxError: maxError.toFixed(2),
      maxErrorDate,
      dirAccuracy: ((dirCorrect / (holdout.length - 1)) * 100).toFixed(0),
    };
  }, [holdout]);

  /* Price feature importance chart data */
  const priceFeatureData = useMemo(() => {
    const fi = report?.price_feature_importances;
    if (!fi) return [];
    return (Object.entries(fi) as [string, number][])
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, importance]) => ({ name, importance }));
  }, [report]);

  /* Toggle line visibility on legend click */
  const handleLegendClick = (payload: { dataKey?: string }) => {
    const key = payload?.dataKey;
    if (!key) return;
    setHiddenLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /* Date range label derived from holdout data */
  const holdoutDateRange =
    holdout.length > 0
      ? `${holdout[0].date.slice(0, 7)} → ${holdout[holdout.length - 1].date.slice(0, 7)}`
      : null;

  return (
    <RoleGate page="/dashboard/forecast">
      <div className="space-y-6">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-extrabold text-[var(--shell-text-bright)]">
            Price Forecast — $/bbl Regression
          </h1>
          <div className="flex items-center gap-2">
            {COMMODITIES.map((c) => (
              <button
                key={c}
                onClick={() => setCommodity(c)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-semibold ${
                  commodity === c
                    ? "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/40"
                    : "text-[var(--shell-muted-2)] border-[var(--shell-border)] hover:border-[var(--shell-border-2)]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-4 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Could not load model report: {error}</span>
          </div>
        )}

        {/* ── Prediction Confidence Banner ────────────────────────────── */}
        {priceRmse != null && (
          <div className="bg-gradient-to-r from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
            <p className="text-[0.6rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase mb-2">
              Price Forecast Model — {modelType} Ensemble · {commodity}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <DollarSign className="w-6 h-6 text-[#38BDF8]" />
              <span className="text-2xl font-extrabold text-[#38BDF8]">
                ±${priceRmse.toFixed(2)}/bbl confidence window
              </span>
              {rmsePctImprovement != null && parseFloat(rmsePctImprovement) > 0 && (
                <span className="text-[0.6rem] font-bold tracking-wide px-2 py-0.5 rounded-full bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
                  ✓ {rmsePctImprovement}% better than random-walk baseline
                </span>
              )}
              {priceMape != null && (
                <span className="text-[0.6rem] font-bold tracking-wide px-2 py-0.5 rounded-full bg-[#FBCE07]/10 text-[#FBCE07] border border-[#FBCE07]/20">
                  Within {priceMape.toFixed(1)}% of actual price on average
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--shell-muted-2)] mt-2">
              On the holdout test set, the model&apos;s predictions were on average $
              {priceRmse.toFixed(2)}/barrel away from actual prices. The model uses{" "}
              {report?.feature_count ?? "40+"} engineered features including price history,
              technical indicators, and news sentiment.
            </p>
          </div>
        )}

        {/* ── Metric Cards with plain-English subtitles ───────────────── */}
        {priceRmse != null && (
          <div>
            <p className="text-[0.6rem] font-bold tracking-[0.1em] text-[var(--shell-muted-3)] uppercase mb-2">
              Holdout Test-Set Performance
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* RMSE */}
              <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
                <p className="text-[0.6rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase mb-2">
                  RMSE
                </p>
                <p className="text-2xl font-extrabold text-[#38BDF8]">
                  ${priceRmse.toFixed(3)}
                </p>
                <p className="text-[0.65rem] text-[var(--shell-muted)] mt-1 leading-snug">
                  Avg prediction error — <em>penalizes large misses</em>
                </p>
                {baselineRmse != null && priceRmse < baselineRmse && (
                  <p className="text-[0.58rem] text-[#22C55E] mt-1.5">
                    ✓ Beats random-walk ({baselineRmse.toFixed(3)})
                  </p>
                )}
              </div>
              {/* MAE */}
              <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
                <p className="text-[0.6rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase mb-2">
                  MAE
                </p>
                <p className="text-2xl font-extrabold text-[#38BDF8]">
                  ${priceMae?.toFixed(3) ?? "—"}
                </p>
                <p className="text-[0.65rem] text-[var(--shell-muted)] mt-1 leading-snug">
                  Typical prediction error in $/barrel
                </p>
                {baselineMae != null && priceMae != null && (
                  <p
                    className={`text-[0.58rem] mt-1.5 ${
                      priceMae < baselineMae
                        ? "text-[#22C55E]"
                        : "text-[var(--shell-muted-3)]"
                    }`}
                  >
                    {priceMae < baselineMae ? "✓ Beats" : "Baseline:"} $
                    {baselineMae.toFixed(3)}
                  </p>
                )}
              </div>
              {/* R² */}
              <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
                <p className="text-[0.6rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase mb-2">
                  R²
                </p>
                <p className="text-2xl font-extrabold text-[#22C55E]">
                  {priceR2 != null ? `${(priceR2 * 100).toFixed(1)}%` : "—"}
                </p>
                <p className="text-[0.65rem] text-[var(--shell-muted)] mt-1 leading-snug">
                  % of price variation the model explains
                </p>
                {baselineR2 != null && (
                  <p className="text-[0.58rem] text-[var(--shell-muted-3)] mt-1.5">
                    Baseline: {(baselineR2 * 100).toFixed(1)}%
                  </p>
                )}
              </div>
              {/* MAPE */}
              <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
                <p className="text-[0.6rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase mb-2">
                  MAPE
                </p>
                <p className="text-2xl font-extrabold text-[#FBCE07]">
                  {priceMape != null ? `${priceMape.toFixed(2)}%` : "—"}
                </p>
                <p className="text-[0.65rem] text-[var(--shell-muted)] mt-1 leading-snug">
                  Average % deviation from actual price
                </p>
                <p className="text-[0.58rem] text-[var(--shell-muted-3)] mt-1.5">
                  Lower = more accurate
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Actual vs. Predicted chart ──────────────────────────────── */}
        {holdout.length > 0 && (
          <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#38BDF8]" />
                <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase">
                  Actual vs. Predicted — Holdout Test Set
                </span>
              </div>
              {holdoutDateRange && (
                <span className="text-[0.6rem] font-mono text-[var(--shell-muted-3)] border border-[var(--shell-border)] px-2 py-0.5 rounded">
                  {holdoutDateRange}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--shell-muted-2)] mb-4">
              3-line overlay of actual closing prices, model predictions, and the naïve
              random-walk baseline over the held-out test period.{" "}
              <span className="text-[var(--shell-muted-3)]">
                Click legend items to show/hide individual lines.
              </span>
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={holdout} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--shell-border)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--shell-border-2)"
                  tick={{ fill: "var(--shell-muted-2)", fontSize: 10 }}
                  tickFormatter={(d: string) => d.slice(5)}
                  interval={Math.floor(holdout.length / 8)}
                />
                <YAxis
                  stroke="var(--shell-border-2)"
                  tick={{ fill: "var(--shell-muted-2)", fontSize: 10 }}
                  domain={["auto", "auto"]}
                  tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                  width={55}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--shell-card)",
                    border: "1px solid var(--shell-border)",
                    borderRadius: "8px",
                    color: "var(--shell-text)",
                    fontSize: "12px",
                  }}
                  formatter={(value, name) => [
                    `$${(value as number).toFixed(2)}/bbl`,
                    String(name) === "actual"
                      ? "Actual"
                      : String(name) === "predicted"
                        ? "Predicted"
                        : "Baseline",
                  ]}
                  labelFormatter={(label) => `Date: ${String(label)}`}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: "11px",
                    color: "var(--shell-muted)",
                    cursor: "pointer",
                  }}
                  formatter={(value: string) =>
                    value === "actual"
                      ? "Actual Price"
                      : value === "predicted"
                        ? "Predicted Price"
                        : "Baseline (LastPrice)"
                  }
                  onClick={(payload) =>
                    handleLegendClick(payload as { dataKey?: string })
                  }
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#22C55E"
                  strokeWidth={2}
                  dot={false}
                  hide={hiddenLines.has("actual")}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#FBCE07"
                  strokeWidth={2}
                  dot={false}
                  hide={hiddenLines.has("predicted")}
                />
                <Line
                  type="monotone"
                  dataKey="baseline"
                  stroke="#64748B"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  hide={hiddenLines.has("baseline")}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* ── Error Analysis Row ──────────────────────────────────── */}
            {errorStats && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-[var(--shell-bg)]/50 border border-[var(--shell-border)] rounded-lg p-3 text-center">
                  <p className="text-[0.55rem] text-[var(--shell-muted-3)] uppercase tracking-wider mb-1">
                    Within $2/bbl
                  </p>
                  <p className="text-lg font-extrabold text-[#22C55E]">
                    {errorStats.within2Pct}%
                  </p>
                  <p className="text-[0.55rem] text-[var(--shell-muted-3)]">
                    of test days
                  </p>
                </div>
                <div className="bg-[var(--shell-bg)]/50 border border-[var(--shell-border)] rounded-lg p-3 text-center">
                  <p className="text-[0.55rem] text-[var(--shell-muted-3)] uppercase tracking-wider mb-1">
                    Largest Miss
                  </p>
                  <p className="text-lg font-extrabold text-[#EF4444]">
                    ${errorStats.maxError}
                  </p>
                  <p className="text-[0.55rem] text-[var(--shell-muted-3)]">
                    {errorStats.maxErrorDate}
                  </p>
                </div>
                <div className="bg-[var(--shell-bg)]/50 border border-[var(--shell-border)] rounded-lg p-3 text-center">
                  <p className="text-[0.55rem] text-[var(--shell-muted-3)] uppercase tracking-wider mb-1">
                    Direction Accuracy
                  </p>
                  <p className="text-lg font-extrabold text-[#A78BFA]">
                    {errorStats.dirAccuracy}%
                  </p>
                  <p className="text-[0.55rem] text-[var(--shell-muted-3)]">
                    correct next-day move
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Feature Importance Chart ────────────────────────────────── */}
        {priceFeatureData.length > 0 && (
          <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-[#FBCE07]" />
              <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase">
                Feature Importance — Price Forecast Model
              </span>
            </div>
            <p className="text-xs text-[var(--shell-muted-2)] mb-3">
              Top features driving price predictions — extracted from the GBM base models
              in the Stacking ensemble.{" "}
              <span className="ml-1 text-[0.6rem]">
                <span className="text-[#38BDF8]">■ Price / Technical</span>
                <span className="mx-1 text-[var(--shell-muted-3)]">·</span>
                <span className="text-[#A78BFA]">■ Sentiment</span>
                <span className="mx-1 text-[var(--shell-muted-3)]">·</span>
                <span className="text-[#FBCE07]">■ Calendar</span>
              </span>
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={priceFeatureData}
                layout="vertical"
                margin={{ left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--shell-border)" />
                <XAxis
                  type="number"
                  stroke="var(--shell-border-2)"
                  tick={{ fill: "var(--shell-muted-2)", fontSize: 11 }}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="var(--shell-border-2)"
                  tick={{ fill: "var(--shell-muted)", fontSize: 11 }}
                  width={110}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--shell-card)",
                    border: "1px solid var(--shell-border)",
                    borderRadius: "8px",
                    color: "var(--shell-text)",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [
                    `${(Number(value) * 100).toFixed(1)}%`,
                    "Importance",
                  ]}
                />
                <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                  {priceFeatureData.map((entry) => (
                    <Cell key={entry.name} fill={featureColor(entry.name)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Feature Glossary (collapsible) ──────────────────────────── */}
        {priceFeatureData.length > 0 && (
          <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl overflow-hidden">
            <button
              onClick={() => setShowGlossary((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--shell-border)]/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#A78BFA]" />
                <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase">
                  Feature Glossary — Plain-Language Descriptions
                </span>
              </div>
              {showGlossary ? (
                <ChevronUp className="w-4 h-4 text-[var(--shell-muted-2)]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[var(--shell-muted-2)]" />
              )}
            </button>
            {showGlossary && (
              <div className="px-5 pb-5">
                <p className="text-xs text-[var(--shell-muted-2)] mb-4">
                  What each feature means in plain language — matched to the importance
                  chart above.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {priceFeatureData.map((f) => {
                    const desc =
                      PRICE_FEATURE_GLOSSARY[f.name.toLowerCase().replace(/ /g, "_")];
                    if (!desc) return null;
                    return (
                      <div
                        key={f.name}
                        className="bg-[var(--shell-bg)]/50 border border-[var(--shell-border)] rounded-lg p-3"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: featureColor(f.name) }}
                          />
                          <span className="text-xs font-bold text-[var(--shell-text-bright)]">
                            {f.name}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--shell-muted)] leading-relaxed">
                          {desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Model Architecture Explainer ─────────────────────────────── */}
        <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-4 h-4 text-[#38BDF8]" />
            <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase">
              Model Architecture — Stacking Ensemble
            </span>
          </div>
          <p className="text-xs text-[var(--shell-muted-2)] mb-4">
            How the price forecast model works — explained for non-technical readers.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ARCH_STEPS.map((step, i) => (
              <div key={step.step} className="relative">
                <div
                  className="bg-[var(--shell-bg)]/50 border rounded-xl p-4 h-full"
                  style={{ borderColor: `${step.color}30` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[0.6rem] font-extrabold shrink-0"
                      style={{
                        background: `${step.color}20`,
                        color: step.color,
                        border: `1px solid ${step.color}40`,
                      }}
                    >
                      {step.step}
                    </div>
                    <step.icon className="w-4 h-4" style={{ color: step.color }} />
                    <span className="text-xs font-bold" style={{ color: step.color }}>
                      {step.label}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--shell-muted)] leading-relaxed">
                    {step.desc}
                  </p>
                </div>
                {i < ARCH_STEPS.length - 1 && (
                  <div className="hidden sm:flex absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                    <span className="text-[var(--shell-muted-3)] text-sm">→</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Tech details row */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Algorithm", value: modelType },
              {
                label: "Features",
                value: `${report?.feature_count ?? "40+"} engineered`,
              },
              {
                label: "Training Samples",
                value: report ? String(report.training_samples) : "—",
              },
              { label: "Validation", value: "3-fold Time-Series CV" },
            ].map((r) => (
              <div
                key={r.label}
                className="flex flex-col gap-1 text-xs border border-[var(--shell-border)] rounded-lg p-2.5"
              >
                <span className="text-[var(--shell-muted-3)] text-[0.6rem] uppercase tracking-wider">
                  {r.label}
                </span>
                <span className="text-[var(--shell-text-bright)] font-semibold">
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Forecast Intelligence Pipeline ──────────────────────────── */}
        <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="w-4 h-4 text-[#22C55E]" />
            <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase">
              Forecast Intelligence Pipeline
            </span>
          </div>
          <p className="text-xs text-[var(--shell-muted-2)] mb-4">
            The end-to-end data flow from raw market data to a $/bbl price prediction.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {FORECAST_PIPELINE.map((step, i) => (
              <div key={step.step} className="relative">
                <div
                  className="bg-[var(--shell-bg)]/50 border rounded-xl p-4 h-full"
                  style={{ borderColor: `${step.color}30` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[0.6rem] font-extrabold shrink-0"
                      style={{
                        background: `${step.color}20`,
                        color: step.color,
                        border: `1px solid ${step.color}40`,
                      }}
                    >
                      {step.step}
                    </div>
                    <step.icon className="w-4 h-4" style={{ color: step.color }} />
                    <span className="text-xs font-bold" style={{ color: step.color }}>
                      {step.label}
                    </span>
                  </div>
                  <p className="text-[0.65rem] text-[var(--shell-muted)] leading-relaxed">
                    {step.desc}
                  </p>
                </div>
                {i < FORECAST_PIPELINE.length - 1 && (
                  <div className="hidden sm:flex absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                    <span className="text-[var(--shell-muted-3)] text-sm">→</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Model Comparison Table (collapsible) ────────────────────── */}
        {report?.all_price_models != null && report.all_price_models.length > 0 && (
          <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl overflow-hidden">
            <button
              onClick={() => setShowComparison((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--shell-border)]/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-[#A78BFA]" />
                <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase">
                  Model Comparison — All Candidates (Holdout Test)
                </span>
              </div>
              {showComparison ? (
                <ChevronUp className="w-4 h-4 text-[var(--shell-muted-2)]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[var(--shell-muted-2)]" />
              )}
            </button>
            {showComparison && (
              <div className="px-5 pb-5 overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--shell-border)]">
                      <th className="text-left py-2 pr-4 text-[var(--shell-muted-2)] font-bold uppercase tracking-wider">
                        Model
                      </th>
                      <th className="text-right py-2 px-3 text-[#38BDF8] font-bold uppercase tracking-wider">
                        RMSE
                      </th>
                      <th className="text-right py-2 px-3 text-[#38BDF8] font-bold uppercase tracking-wider">
                        MAE
                      </th>
                      <th className="text-right py-2 px-3 text-[#22C55E] font-bold uppercase tracking-wider">
                        R²
                      </th>
                      {report.all_price_models.some((m) => m.mape != null) && (
                        <th className="text-right py-2 px-3 text-[#FBCE07] font-bold uppercase tracking-wider">
                          MAPE
                        </th>
                      )}
                      <th className="text-right py-2 pl-3 text-[var(--shell-muted-2)] font-bold uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.all_price_models.map((m) => {
                      const isBaseline = m.is_baseline === true;
                      return (
                        <tr
                          key={m.name}
                          className={`border-b border-[var(--shell-border)]/50 last:border-0 ${
                            m.deployed ? "bg-[#38BDF8]/5" : ""
                          }`}
                        >
                          <td className="py-2.5 pr-4 font-medium text-[var(--shell-text)]">
                            {m.deployed && <span className="mr-1">★</span>}
                            {m.name}
                          </td>
                          <td className="text-right py-2.5 px-3 font-mono text-[var(--shell-text-bright)]">
                            {m.rmse.toFixed(3)}
                          </td>
                          <td className="text-right py-2.5 px-3 font-mono text-[var(--shell-text-bright)]">
                            {m.mae.toFixed(3)}
                          </td>
                          <td className="text-right py-2.5 px-3 font-mono text-[var(--shell-text-bright)]">
                            {(m.r2 * 100).toFixed(2)}%
                          </td>
                          {report.all_price_models!.some((x) => x.mape != null) && (
                            <td className="text-right py-2.5 px-3 font-mono text-[var(--shell-text-bright)]">
                              {m.mape != null ? `${m.mape.toFixed(2)}%` : "—"}
                            </td>
                          )}
                          <td className="text-right py-2.5 pl-3">
                            {m.deployed ? (
                              <span className="text-[#22C55E] font-bold">
                                ✅ DEPLOYED
                              </span>
                            ) : isBaseline ? (
                              <span className="text-[var(--shell-muted)]">
                                📊 Baseline
                              </span>
                            ) : (
                              <span className="text-[var(--shell-muted-2)]">
                                ◻ Candidate
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="text-[0.6rem] text-[var(--shell-muted-3)] mt-3">
                  Lower RMSE / MAE and higher R² are better. All models evaluated on
                  held-out test data unseen during training.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </RoleGate>
  );
}

