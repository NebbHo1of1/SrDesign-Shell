/* ── SIGNAL — AI Model Page ───────────────────────────────────────────
   Explainable AI: model report card, feature importance chart,
   pipeline explainer, confidence meter, architecture table.
   Now fetches *real* metrics from the /model-report API endpoint
   powered by the trained model from train_model.py.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useEffect, useState } from "react";
import { Brain, Gauge, Cpu, GitBranch, AlertCircle, BookOpen, History } from "lucide-react";
import RoleGate from "@/components/RoleGate";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { api, ModelReport, ModelPrediction, PredictionHistoryPoint } from "@/lib/api";

/* ── Static fallback (only shown while loading / on error) ──────────── */
const FALLBACK_FEATURES = [
  { name: "RSI", importance: 0.06 },
  { name: "Momentum", importance: 0.05 },
  { name: "MACD × Volatility", importance: 0.05 },
  { name: "MACD", importance: 0.04 },
];

const PIPELINE = [
  {
    step: "1. News Ingestion",
    desc: "Headlines fetched from multiple global news APIs covering geopolitics, energy, and macro events.",
    icon: <GitBranch className="w-5 h-5 text-[#38BDF8]" />,
  },
  {
    step: "2. NLP Processing",
    desc: "Text preprocessing, entity recognition, and sentiment scoring via VADER and domain-specific rules.",
    icon: <Cpu className="w-5 h-5 text-[#A78BFA]" />,
  },
  {
    step: "3. Feature Engineering",
    desc: "33 engineered features including MACD, RSI, sentiment rolling averages, and calendar seasonality.",
    icon: <Brain className="w-5 h-5 text-[#FBCE07]" />,
  },
  {
    step: "4. Prediction",
    desc: "Trained model (train_model.py) generates UP/DOWN predictions with probability-calibrated confidence.",
    icon: <Gauge className="w-5 h-5 text-[#22C55E]" />,
  },
];

/* ── Feature descriptions for non-technical stakeholders ────────────── */
const FEATURE_GLOSSARY: Record<string, string> = {
  rsi: "Relative Strength Index — a momentum oscillator (0–100) that measures speed and magnitude of recent price changes. Values above 70 suggest the asset may be overbought; below 30, oversold.",
  rsi_norm: "Normalized RSI — the RSI value re-centered around zero (RSI − 50) / 50. Negative values indicate bearish momentum, positive values indicate bullish momentum.",
  rsi_overbought: "RSI Overbought Flag — equals 1 when RSI exceeds 70, signaling the market may be due for a pullback.",
  rsi_oversold: "RSI Oversold Flag — equals 1 when RSI drops below 30, signaling the market may be due for a rebound.",
  macd: "Moving Average Convergence/Divergence — the difference between a 12-period and 26-period exponential moving average. Positive values suggest upward momentum.",
  macd_hist: "MACD Histogram — the gap between the MACD line and its 9-period signal line. Widening bars mean strengthening momentum.",
  macd_signal: "MACD Signal Line — a 9-period exponential moving average of the MACD. Crossovers between MACD and its signal often precede trend changes.",
  macd_x_tone: "MACD × Sentiment — multiplies the MACD histogram by average headline sentiment. Captures moments when both technical and news signals align.",
  macd_x_vol: "MACD × Volatility — multiplies the MACD histogram by 5-day price volatility. Highlights momentum shifts during high-uncertainty periods.",
  rsi_x_tone: "RSI × Sentiment — combines the normalized RSI with headline sentiment, detecting when technical momentum and news tone reinforce each other.",
  momentum_3: "3-Day Momentum — the absolute price change over the last three trading days. Positive means prices have risen; negative means they have fallen.",
  volatility_5: "5-Day Volatility — the standard deviation of daily price changes over the most recent five days. Higher values indicate greater market uncertainty.",
  volatility_spike: "Volatility Spike Flag — equals 1 when current 5-day volatility exceeds its own 5-day average, flagging unusual market turbulence.",
  avg_tone: "Average Headline Sentiment — the mean VADER sentiment score across recent oil-related news headlines. Ranges from −1 (very negative) to +1 (very positive).",
  tone_ma_3: "3-Day Sentiment Moving Average — a smoothed version of headline sentiment over three days, filtering out single-day noise.",
  tone_x_volatility: "Sentiment × Volatility — multiplies headline sentiment by 5-day volatility. Large absolute values mean strong sentiment during volatile markets.",
  price_change_1: "1-Day Price Change — the dollar change in price from the previous trading day. Positive means the price rose.",
  price_vs_ema12: "Price vs. 12-Day EMA — how far the current price sits above or below its 12-day exponential moving average, expressed as a ratio.",
  ema12_vs_ema26: "EMA-12 vs. EMA-26 — the ratio between the 12-day and 26-day exponential moving averages. Positive means the short-term trend leads the longer trend.",
  down_momentum: "Down-Day Flag — equals 1 when the most recent close is lower than the prior day's close, capturing consecutive bearish sessions.",
  return_1: "1-Day Return — the percentage change in price from the previous day.",
  return_3: "3-Day Return — the cumulative percentage change over the last three trading days.",
  price_change_2: "2-Day Price Change — the dollar change in price over the last two trading days.",
  day_of_week: "Day of Week — numeric encoding (0 = Monday … 4 = Friday) capturing weekly seasonality patterns in oil markets.",
  month: "Month — numeric encoding (1–12) reflecting seasonal supply-demand patterns such as winter heating demand or summer driving season.",
  headline_count: "Headline Count — the number of oil-related news articles captured for a given day. Spikes often correlate with market-moving events.",
};

const COMMODITIES = ["WTI", "BRENT"];

export default function ModelPage() {
  const [commodity, setCommodity] = useState("WTI");
  const [report, setReport] = useState<ModelReport | null>(null);
  const [prediction, setPrediction] = useState<ModelPrediction | null>(null);
  const [predHistory, setPredHistory] = useState<PredictionHistoryPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .modelReport()
      .then(setReport)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    setPrediction(null);
    api
      .predict(commodity)
      .then(setPrediction)
      .catch(() => {
        /* prediction may fail if DB is empty — non-critical */
      });
    api
      .predictionHistory(commodity, 30)
      .then(setPredHistory)
      .catch(() => {});
  }, [commodity]);

  /* Derive display values from the report (or show fallback) */
  const accuracy = report
    ? (report.test_accuracy * 100).toFixed(1)
    : "—";
  const precision = report
    ? report.classification_metrics.precision.toFixed(2)
    : "—";
  const recall = report
    ? report.classification_metrics.recall.toFixed(2)
    : "—";
  const f1 = report
    ? report.classification_metrics.f1_score.toFixed(2)
    : "—";

  /* Build feature importance chart data from the report */
  const featureData = report
    ? Object.entries(report.feature_importances)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([name, importance]) => ({ name, importance }))
    : FALLBACK_FEATURES;

  const maxImportance = Math.max(...featureData.map((f) => f.importance), 0.1);

  return (
    <RoleGate page="/dashboard/model">
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-extrabold text-[var(--shell-text-bright)]">
          Direction Model — UP / DOWN Classifier
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

      {/* Live prediction banner */}
      {prediction && (
        <div className="bg-gradient-to-r from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
          <p className="text-[0.6rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase mb-2">
            Live Model Prediction — {prediction.commodity}
          </p>
          <div className="flex items-center gap-4">
            <span
              className={`text-3xl font-extrabold ${
                prediction.prediction === "UP"
                  ? "text-[#22C55E]"
                  : prediction.prediction === "DOWN"
                    ? "text-[#EF4444]"
                    : "text-[#FBCE07]"
              }`}
            >
              {prediction.prediction}
            </span>
            <span className="text-sm text-[var(--shell-muted)]">
              Confidence: {(prediction.confidence * 100).toFixed(1)}% ·
              P(UP): {(prediction.probability_up * 100).toFixed(1)}% ·
              Model: {prediction.model_type}
            </span>
          </div>
        </div>
      )}

      {/* ── Direction Model metrics ─────────────────────────────────── */}
      <div>
        <p className="text-[0.6rem] font-bold tracking-[0.1em] text-[var(--shell-muted-3)] uppercase mb-2">
          Direction Model — UP / DOWN Classifier
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Accuracy",
              value: accuracy !== "—" ? `${accuracy}%` : "—",
              color: "text-[#22C55E]",
            },
            {
              label: "Precision",
              value: precision,
              color: "text-[#38BDF8]",
            },
            {
              label: "Recall",
              value: recall,
              color: "text-[#FBCE07]",
            },
            {
              label: "F1 Score",
              value: f1,
              color: "text-[#A78BFA]",
            },
          ].map((m) => (
            <div
              key={m.label}
              className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5"
            >
              <p className="text-[0.6rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase mb-2">
                {m.label}
              </p>
              <p className={`text-2xl font-extrabold ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Importance */}
        <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-[#FBCE07]" />
            <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase">
              Feature Importance (from trained model)
            </span>
          </div>
          <p className="text-xs text-[var(--shell-muted-2)] mb-4">
            Top features driving classification decisions — extracted from the
            trained {report?.model_type ?? "RandomForest"} model.
          </p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={featureData}
              layout="vertical"
              margin={{ left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--shell-border)" />
              <XAxis
                type="number"
                domain={[0, Math.ceil(maxImportance * 100) / 100 + 0.01]}
                stroke="var(--shell-border-2)"
                tick={{ fill: "var(--shell-muted-2)", fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="var(--shell-border-2)"
                tick={{ fill: "var(--shell-muted)", fontSize: 11 }}
                width={130}
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
              <Bar
                dataKey="importance"
                fill="#FBCE07"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Model Architecture */}
        <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Gauge className="w-4 h-4 text-[#38BDF8]" />
            <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase">
              Model Architecture
            </span>
          </div>
          <div className="space-y-3">
            {[
              {
                label: "Algorithm",
                value: report?.model_type ?? "RandomForestClassifier",
              },
              {
                label: "Features",
                value: report
                  ? `${report.feature_count} engineered features`
                  : "33 engineered features",
              },
              {
                label: "Training Size",
                value: report
                  ? `${report.training_samples} samples`
                  : "—",
              },
              {
                label: "Validation",
                value: "Time-Series 5-fold CV",
              },
              {
                label: "Target",
                value: "Crude Oil 3-Day Price Direction (UP / DOWN)",
              },
              {
                label: "Confidence Threshold",
                value: report ? `${(report.threshold * 100).toFixed(0)}%` : "75%",
              },
            ].map((r) => (
              <div
                key={r.label}
                className="flex items-center justify-between text-sm border-b border-[var(--shell-border)] pb-2"
              >
                <span className="text-[var(--shell-muted)]">{r.label}</span>
                <span className="text-[var(--shell-text-bright)] font-medium">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Glossary — plain-language descriptions for executives */}
      <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-[#A78BFA]" />
          <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase">
            Feature Glossary
          </span>
        </div>
        <p className="text-xs text-[var(--shell-muted-2)] mb-4">
          What each feature means in plain language — matched to the importance
          chart above.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {featureData.map((f) => {
            const key = f.name.toLowerCase().replace(/ /g, "_");
            const desc = FEATURE_GLOSSARY[key];
            if (!desc) return null;
            return (
              <div
                key={f.name}
                className="bg-[var(--shell-bg)]/50 border border-[var(--shell-border)] rounded-lg p-3"
              >
                <span className="text-xs font-bold text-[var(--shell-text-bright)]">
                  {f.name}
                </span>
                <p className="text-xs text-[var(--shell-muted)] mt-1 leading-relaxed">
                  {desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Prediction History Timeline */}
      {predHistory.length > 0 && (
        <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-[#06B6D4]" />
            <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase">
              Prediction History — {commodity}
            </span>
          </div>
          <p className="text-xs text-[var(--shell-muted-2)] mb-4">
            Daily aggregated model confidence and sentiment over time. Green bars
            = UP prediction days, red bars = DOWN prediction days.
          </p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={predHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--shell-border)" />
              <XAxis
                dataKey="date"
                stroke="var(--shell-border-2)"
                tick={{ fill: "var(--shell-muted-2)", fontSize: 10 }}
                tickFormatter={(d: string) => d.slice(5)}
              />
              <YAxis
                stroke="var(--shell-border-2)"
                tick={{ fill: "var(--shell-muted-2)", fontSize: 10 }}
                domain={[0, 1]}
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
                  name === "avg_confidence"
                    ? `${(Number(value) * 100).toFixed(1)}%`
                    : Number(value).toFixed(3),
                  name === "avg_confidence" ? "Confidence" : "Sentiment",
                ]}
                labelFormatter={(label) => `Date: ${String(label)}`}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px", color: "var(--shell-muted)" }}
                formatter={(value: string) =>
                  value === "avg_confidence" ? "Avg Confidence" : "Avg Sentiment"
                }
              />
              <Line
                type="monotone"
                dataKey="avg_confidence"
                stroke="#FBCE07"
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: PredictionHistoryPoint };
                  if (cx == null || cy == null || !payload) return <circle r={0} />;
                  const color = payload.dominant_prediction === "UP" ? "#22C55E" : "#EF4444";
                  return (
                    <circle
                      key={`dot-conf-${payload.date}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={color}
                      stroke={color}
                      strokeWidth={1}
                    />
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="avg_sentiment"
                stroke="#38BDF8"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Daily summary cards */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-[var(--shell-bg)]/50 border border-[var(--shell-border)] rounded-lg p-3 text-center">
              <p className="text-[0.55rem] text-[var(--shell-muted-3)] uppercase tracking-wider">Days Tracked</p>
              <p className="text-lg font-extrabold text-[var(--shell-text-bright)]">{predHistory.length}</p>
            </div>
            <div className="bg-[var(--shell-bg)]/50 border border-[var(--shell-border)] rounded-lg p-3 text-center">
              <p className="text-[0.55rem] text-[var(--shell-muted-3)] uppercase tracking-wider">UP Days</p>
              <p className="text-lg font-extrabold text-[#22C55E]">
                {predHistory.filter((p) => p.dominant_prediction === "UP").length}
              </p>
            </div>
            <div className="bg-[var(--shell-bg)]/50 border border-[var(--shell-border)] rounded-lg p-3 text-center">
              <p className="text-[0.55rem] text-[var(--shell-muted-3)] uppercase tracking-wider">DOWN Days</p>
              <p className="text-lg font-extrabold text-[#EF4444]">
                {predHistory.filter((p) => p.dominant_prediction === "DOWN").length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline explainer */}
      <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
        <div className="text-[0.65rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase mb-5">
          Intelligence Pipeline
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PIPELINE.map((p) => (
            <div
              key={p.step}
              className="bg-[var(--shell-bg)]/50 border border-[var(--shell-border)] rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                {p.icon}
                <span className="text-xs font-bold text-[var(--shell-text-bright)]">
                  {p.step}
                </span>
              </div>
              <p className="text-xs text-[var(--shell-muted-2)] leading-relaxed">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
    </RoleGate>
  );
}
