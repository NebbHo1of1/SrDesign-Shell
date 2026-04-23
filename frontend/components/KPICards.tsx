/* ── SIGNAL — KPI Cards ───────────────────────────────────────────────
   Four executive-level KPI cards across the top of the dashboard:
   Market Status, Risk Level, Prediction Confidence, Volatility Index.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import type { KPIs } from "@/lib/api";
import {
  Activity,
  AlertTriangle,
  Gauge,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface Props {
  wti: KPIs | null;
  brent: KPIs | null;
  loading: boolean;
}

function Skeleton() {
  return (
    <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5 animate-pulse">
      <div className="h-3 w-20 bg-[var(--shell-border-2)] rounded mb-3" />
      <div className="h-7 w-16 bg-[var(--shell-border-2)] rounded mb-2" />
      <div className="h-3 w-24 bg-[var(--shell-border)] rounded" />
    </div>
  );
}

export default function KPICards({ wti, brent, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} />
        ))}
      </div>
    );
  }

  const pred = wti?.model_prediction ?? wti?.last_prediction ?? "—";
  const conf = wti?.model_confidence ?? wti?.last_confidence;
  const sentiment = wti?.avg_sentiment_24h ?? 0;
  const highImpact = (wti?.high_impact_count_24h ?? 0) + (brent?.high_impact_count_24h ?? 0);
  const isModelPred = wti?.model_prediction != null;

  // Derived risk level
  const riskScore =
    Math.min(100, Math.abs(sentiment) * 60 + highImpact * 10);
  const riskLabel =
    riskScore >= 60 ? "HIGH" : riskScore >= 30 ? "MODERATE" : "LOW";
  const riskColor =
    riskScore >= 60
      ? "text-[#EF4444]"
      : riskScore >= 30
        ? "text-[#F59E0B]"
        : "text-[#22C55E]";
  const riskBg =
    riskScore >= 60
      ? "border-[#EF4444]/30"
      : riskScore >= 30
        ? "border-[#F59E0B]/30"
        : "border-[#22C55E]/30";

  const cards = [
    {
      label: "Market Status",
      value: pred,
      sub:
        pred === "UP"
          ? isModelPred ? "AI model: Bullish" : "Bullish signal detected"
          : pred === "DOWN"
            ? isModelPred ? "AI model: Bearish" : "Bearish signal detected"
            : pred === "UNCERTAIN"
              ? "AI model: Uncertain"
              : "Awaiting signal",
      icon:
        pred === "UP" ? (
          <TrendingUp className="w-5 h-5 text-[#22C55E]" />
        ) : pred === "DOWN" ? (
          <TrendingDown className="w-5 h-5 text-[#EF4444]" />
        ) : (
          <Activity className="w-5 h-5 text-[#F59E0B]" />
        ),
      color:
        pred === "UP"
          ? "text-[#22C55E]"
          : pred === "DOWN"
            ? "text-[#EF4444]"
            : "text-[#F59E0B]",
      border:
        pred === "UP"
          ? "border-[#22C55E]/30"
          : pred === "DOWN"
            ? "border-[#EF4444]/30"
            : "border-[#F59E0B]/30",
    },
    {
      label: "Risk Level",
      value: riskLabel,
      sub: `Score: ${riskScore.toFixed(0)} / 100`,
      icon: <AlertTriangle className={`w-5 h-5 ${riskColor}`} />,
      color: riskColor,
      border: riskBg,
    },
    {
      label: "Prediction Confidence",
      value: conf != null ? `${(conf * 100).toFixed(0)}%` : "—",
      sub: conf != null && conf >= 0.75 ? "High confidence" : conf != null ? "Moderate confidence" : "Model unavailable",
      icon: <Gauge className="w-5 h-5 text-[#38BDF8]" />,
      color: "text-[#38BDF8]",
      border: "border-[#38BDF8]/30",
    },
    {
      label: "24h Sentiment",
      value: sentiment > 0 ? `+${sentiment.toFixed(3)}` : sentiment.toFixed(3),
      sub: `${wti?.total_headlines_24h ?? 0} headlines analyzed`,
      icon: <Activity className="w-5 h-5 text-[#A78BFA]" />,
      color:
        sentiment > 0.1
          ? "text-[#22C55E]"
          : sentiment < -0.1
            ? "text-[#EF4444]"
            : "text-[var(--shell-muted)]",
      border: "border-[#A78BFA]/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-[#38BDF8]/5 ${c.border}`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.6rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase">
              {c.label}
            </span>
            {c.icon}
          </div>
          <div className={`text-2xl font-extrabold ${c.color}`}>{c.value}</div>
          <p className="text-xs text-[var(--shell-muted-2)] mt-1">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
