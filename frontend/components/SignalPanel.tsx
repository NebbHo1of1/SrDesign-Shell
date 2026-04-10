/* ── SIGNAL — AI Signal Panel ─────────────────────────────────────────
   Current prediction, confidence gauge, signal strength, top drivers.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import type { Headline, KPIs } from "@/lib/api";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
} from "lucide-react";

interface Props {
  kpi: KPIs | null;
  headline: Headline | undefined;
  loading: boolean;
}

export default function SignalPanel({ kpi, headline, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-xl p-5 h-full animate-pulse">
        <div className="h-4 w-24 bg-[#334155] rounded mb-4" />
        <div className="h-16 w-24 bg-[#334155] rounded mx-auto my-6" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-[#1E293B] rounded" />
          <div className="h-3 w-3/4 bg-[#1E293B] rounded" />
        </div>
      </div>
    );
  }

  const pred = kpi?.last_prediction ?? "—";
  const conf = kpi?.last_confidence ?? 0;
  const confPct = Math.round(conf * 100);

  const isUp = pred === "UP";
  const isDown = pred === "DOWN";

  const predColor = isUp
    ? "text-[#22C55E]"
    : isDown
      ? "text-[#EF4444]"
      : "text-[#F59E0B]";
  const predBg = isUp
    ? "bg-[#22C55E]/10"
    : isDown
      ? "bg-[#EF4444]/10"
      : "bg-[#F59E0B]/10";
  const PredIcon = isUp ? TrendingUp : isDown ? TrendingDown : Activity;

  // Confidence bar color
  const confBarColor =
    conf >= 0.75
      ? "bg-[#22C55E]"
      : conf >= 0.55
        ? "bg-[#F59E0B]"
        : "bg-[#EF4444]";

  // Simulated top drivers (in production these come from feature importance)
  const drivers = [
    { label: "Sentiment", direction: kpi?.avg_sentiment_24h && kpi.avg_sentiment_24h > 0 ? "↑" : "↓", positive: kpi?.avg_sentiment_24h ? kpi.avg_sentiment_24h > 0 : false },
    { label: "Momentum", direction: isUp ? "↑" : "↓", positive: isUp },
    { label: "Geopolitical Risk", direction: (kpi?.high_impact_count_24h ?? 0) > 2 ? "↑" : "↓", positive: false },
  ];

  return (
    <div className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-xl p-5 h-full animate-glow-border">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <Zap className="w-4 h-4 text-[#FBCE07]" />
        <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[#64748B] uppercase">
          AI Signal — WTI
        </span>
      </div>

      {/* Prediction */}
      <div className="text-center mb-5">
        <div
          className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl ${predBg}`}
        >
          <PredIcon className={`w-6 h-6 ${predColor}`} />
          <span className={`text-3xl font-extrabold ${predColor}`}>{pred}</span>
        </div>
      </div>

      {/* Confidence Gauge */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-[#64748B]">Confidence</span>
          <span className="text-[#F8FAFC] font-bold">{confPct}%</span>
        </div>
        <div className="h-2 bg-[#0A0E17] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${confBarColor}`}
            style={{ width: `${confPct}%` }}
          />
        </div>
      </div>

      {/* Signal Strength */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-[#64748B]">Signal Strength</span>
          <span className="text-[#38BDF8] font-semibold">
            {confPct >= 75 ? "Strong" : confPct >= 55 ? "Moderate" : "Weak"}
          </span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i < Math.ceil(confPct / 20)
                  ? "bg-[#38BDF8]"
                  : "bg-[#1E293B]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Top Drivers */}
      <div>
        <div className="text-[0.6rem] font-bold tracking-[0.08em] text-[#475569] uppercase mb-2">
          Top Drivers
        </div>
        <div className="space-y-1.5">
          {drivers.map((d) => (
            <div
              key={d.label}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-[#94A3B8]">{d.label}</span>
              <span
                className={`font-bold ${
                  d.positive ? "text-[#22C55E]" : "text-[#EF4444]"
                }`}
              >
                {d.direction}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Latest headline context */}
      {headline && (
        <div className="mt-4 pt-4 border-t border-[#1E293B]">
          <p className="text-[0.6rem] text-[#475569] uppercase tracking-[0.08em] mb-1">
            Latest Signal Source
          </p>
          <p className="text-xs text-[#94A3B8] leading-relaxed line-clamp-2">
            {headline.title}
          </p>
        </div>
      )}
    </div>
  );
}
