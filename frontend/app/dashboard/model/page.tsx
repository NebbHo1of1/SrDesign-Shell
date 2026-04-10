/* ── SIGNAL — AI Model Page ───────────────────────────────────────────
   Explainable AI: model report card, feature importance chart,
   pipeline explainer, confidence meter, architecture table.
   Now fetches *real* metrics from the /model-report API endpoint
   powered by the trained model from train_model.py.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useEffect, useState } from "react";
import { Brain, Gauge, Cpu, GitBranch, AlertCircle } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { api, ModelReport, ModelPrediction } from "@/lib/api";

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

export default function ModelPage() {
  const [report, setReport] = useState<ModelReport | null>(null);
  const [prediction, setPrediction] = useState<ModelPrediction | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .modelReport()
      .then(setReport)
      .catch((e) => setError(e.message));

    api
      .predict("WTI")
      .then(setPrediction)
      .catch(() => {
        /* prediction may fail if DB is empty — non-critical */
      });
  }, []);

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
    <div className="space-y-6">
      <h1 className="text-xl font-extrabold text-[#F8FAFC]">
        AI Model — Explainable Intelligence
      </h1>

      {error && (
        <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-4 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Could not load model report: {error}</span>
        </div>
      )}

      {/* Live prediction banner */}
      {prediction && (
        <div className="bg-gradient-to-r from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-xl p-5">
          <p className="text-[0.6rem] font-bold tracking-[0.1em] text-[#64748B] uppercase mb-2">
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
            <span className="text-sm text-[#94A3B8]">
              Confidence: {(prediction.confidence * 100).toFixed(1)}% ·
              P(UP): {(prediction.probability_up * 100).toFixed(1)}% ·
              Model: {prediction.model_type}
            </span>
          </div>
        </div>
      )}

      {/* Model metrics */}
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
            className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-xl p-5"
          >
            <p className="text-[0.6rem] font-bold tracking-[0.1em] text-[#64748B] uppercase mb-2">
              {m.label}
            </p>
            <p className={`text-2xl font-extrabold ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Importance */}
        <div className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-[#FBCE07]" />
            <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[#64748B] uppercase">
              Feature Importance (from trained model)
            </span>
          </div>
          <p className="text-xs text-[#64748B] mb-4">
            Top features driving classification decisions — extracted from the
            trained {report?.model_type ?? "RandomForest"} model.
          </p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={featureData}
              layout="vertical"
              margin={{ left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis
                type="number"
                domain={[0, Math.ceil(maxImportance * 100) / 100 + 0.01]}
                stroke="#334155"
                tick={{ fill: "#64748B", fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#334155"
                tick={{ fill: "#94A3B8", fontSize: 11 }}
                width={130}
              />
              <Tooltip
                contentStyle={{
                  background: "#1A2234",
                  border: "1px solid #1E293B",
                  borderRadius: "8px",
                  color: "#E2E8F0",
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
        <div className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Gauge className="w-4 h-4 text-[#38BDF8]" />
            <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[#64748B] uppercase">
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
                className="flex items-center justify-between text-sm border-b border-[#1E293B] pb-2"
              >
                <span className="text-[#94A3B8]">{r.label}</span>
                <span className="text-[#F8FAFC] font-medium">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline explainer */}
      <div className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-xl p-5">
        <div className="text-[0.65rem] font-bold tracking-[0.1em] text-[#64748B] uppercase mb-5">
          Intelligence Pipeline
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PIPELINE.map((p) => (
            <div
              key={p.step}
              className="bg-[#0A0E17]/50 border border-[#1E293B] rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                {p.icon}
                <span className="text-xs font-bold text-[#F8FAFC]">
                  {p.step}
                </span>
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
