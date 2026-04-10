/* ── SIGNAL — AI Model Page ───────────────────────────────────────────
   Explainable AI: model report card, feature importance chart,
   pipeline explainer, confidence meter, architecture table.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { Brain, Gauge, Cpu, GitBranch } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

/* Static model report data — in production this would be loaded from
   the /model-report API endpoint or the model_training_report.json */
const MODEL = {
  accuracy: 97.06,
  precision: 0.95,
  recall: 0.93,
  f1: 0.94,
  timestamp: "2026-04-02 23:57:10",
  features: [
    { name: "Sentiment Score", importance: 0.4 },
    { name: "Event Features", importance: 0.25 },
    { name: "Impact Score", importance: 0.2 },
    { name: "Momentum", importance: 0.15 },
  ],
};

const PIPELINE = [
  {
    step: "1. News Ingestion",
    desc: "Headlines fetched from multiple global news APIs covering geopolitics, energy, and macro events.",
    icon: <GitBranch className="w-5 h-5 text-[#38BDF8]" />,
  },
  {
    step: "2. NLP Processing",
    desc: "Text preprocessing, entity recognition, and sentiment scoring via transformer-based models.",
    icon: <Cpu className="w-5 h-5 text-[#A78BFA]" />,
  },
  {
    step: "3. Feature Engineering",
    desc: "Sentiment scores, event types, impact scores, and momentum indicators combined into feature vectors.",
    icon: <Brain className="w-5 h-5 text-[#FBCE07]" />,
  },
  {
    step: "4. Prediction",
    desc: "Random Forest classifier generates UP/DOWN/NEUTRAL predictions with confidence scores.",
    icon: <Gauge className="w-5 h-5 text-[#22C55E]" />,
  },
];

export default function ModelPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-extrabold text-[#F8FAFC]">
        AI Model — Explainable Intelligence
      </h1>

      {/* Model metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Accuracy",
            value: `${MODEL.accuracy}%`,
            color: "text-[#22C55E]",
          },
          {
            label: "Precision",
            value: MODEL.precision.toFixed(2),
            color: "text-[#38BDF8]",
          },
          {
            label: "Recall",
            value: MODEL.recall.toFixed(2),
            color: "text-[#FBCE07]",
          },
          {
            label: "F1 Score",
            value: MODEL.f1.toFixed(2),
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
              Feature Importance
            </span>
          </div>
          <p className="text-xs text-[#64748B] mb-4">
            Why is the model making this prediction? These are the top factors
            driving the classification decision.
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={MODEL.features}
              layout="vertical"
              margin={{ left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis
                type="number"
                domain={[0, 0.5]}
                stroke="#334155"
                tick={{ fill: "#64748B", fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#334155"
                tick={{ fill: "#94A3B8", fontSize: 11 }}
                width={110}
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
                  `${(Number(value) * 100).toFixed(0)}%`,
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

        {/* Confidence Gauge (text-based) */}
        <div className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Gauge className="w-4 h-4 text-[#38BDF8]" />
            <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[#64748B] uppercase">
              Model Architecture
            </span>
          </div>
          <div className="space-y-3">
            {[
              { label: "Algorithm", value: "Random Forest Classifier" },
              { label: "Features", value: "4 engineered features" },
              { label: "Training Size", value: "~5,000 labeled samples" },
              { label: "Validation", value: "Stratified 5-fold CV" },
              { label: "Target", value: "Crude Oil Price Direction (UP/DOWN/NEUTRAL)" },
              { label: "Last Trained", value: MODEL.timestamp },
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
