/* ── SIGNAL — Signal Engine Page ──────────────────────────────────────
   Risk meter, market status board, alert feed, volatility tracker.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useEffect, useState } from "react";
import { api, type Headline, type KPIs } from "@/lib/api";
import {
  AlertTriangle,
  Zap,
  Shield,
  Activity,
  Globe,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

function RiskMeter({ score }: { score: number }) {
  const label =
    score >= 70 ? "CRITICAL" : score >= 40 ? "ELEVATED" : "STABLE";
  const color =
    score >= 70
      ? "text-[#EF4444]"
      : score >= 40
        ? "text-[#F59E0B]"
        : "text-[#22C55E]";
  const barColor =
    score >= 70
      ? "bg-[#EF4444]"
      : score >= 40
        ? "bg-[#F59E0B]"
        : "bg-[#22C55E]";

  return (
    <div className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4 text-[#EF4444]" />
        <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[#64748B] uppercase">
          Risk Level
        </span>
      </div>
      <div className={`text-3xl font-extrabold ${color} mb-1`}>{label}</div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-[#0A0E17] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
            style={{ width: `${Math.min(100, score)}%` }}
          />
        </div>
        <span className="text-xs text-[#94A3B8] font-mono">
          {score.toFixed(0)}
        </span>
      </div>
    </div>
  );
}

export default function SignalsPage() {
  const [kpi, setKpi] = useState<KPIs | null>(null);
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.kpis("WTI").catch(() => null),
      api.headlines("WTI", 50).catch(() => []),
    ])
      .then(([k, h]) => {
        setKpi(k);
        setHeadlines(h);
      })
      .finally(() => setLoading(false));
  }, []);

  const sentiment = kpi?.avg_sentiment_24h ?? 0;
  const highImpact = kpi?.high_impact_count_24h ?? 0;
  const riskScore = Math.min(100, Math.abs(sentiment) * 60 + highImpact * 10);

  // Market status
  const pred = kpi?.last_prediction ?? "—";
  const marketStatus =
    pred === "UP"
      ? { label: "BULLISH", color: "text-[#22C55E]", icon: <TrendingUp className="w-5 h-5" /> }
      : pred === "DOWN"
        ? { label: "BEARISH", color: "text-[#EF4444]", icon: <TrendingDown className="w-5 h-5" /> }
        : { label: "NEUTRAL", color: "text-[#F59E0B]", icon: <Activity className="w-5 h-5" /> };

  // High-impact alerts
  const alerts = headlines
    .filter((h) => h.impact_score >= 65)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Zap className="w-5 h-5 text-[#FBCE07]" />
        <h1 className="text-xl font-extrabold text-[#F8FAFC]">
          Signal Engine
        </h1>
      </div>

      {/* Top row: Risk + Market Status + Volatility */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RiskMeter score={riskScore} />

        {/* Market Status */}
        <div className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-[#38BDF8]" />
            <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[#64748B] uppercase">
              Market Status — WTI
            </span>
          </div>
          <div className={`flex items-center gap-2 ${marketStatus.color}`}>
            {marketStatus.icon}
            <span className="text-3xl font-extrabold">{marketStatus.label}</span>
          </div>
          <p className="text-xs text-[#64748B] mt-2">
            Confidence:{" "}
            {kpi?.last_confidence != null
              ? `${(kpi.last_confidence * 100).toFixed(0)}%`
              : "—"}
          </p>
        </div>

        {/* 24h Summary */}
        <div className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-[#06B6D4]" />
            <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[#64748B] uppercase">
              24h Intelligence
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#94A3B8]">Headlines</span>
              <span className="text-[#F8FAFC] font-bold">
                {kpi?.total_headlines_24h ?? 0}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#94A3B8]">High Impact</span>
              <span className="text-[#EF4444] font-bold">{highImpact}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#94A3B8]">Avg Sentiment</span>
              <span
                className={`font-bold ${
                  sentiment > 0.1
                    ? "text-[#22C55E]"
                    : sentiment < -0.1
                      ? "text-[#EF4444]"
                      : "text-[#94A3B8]"
                }`}
              >
                {sentiment > 0 ? "+" : ""}
                {sentiment.toFixed(3)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Alert feed */}
      <div className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
          <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[#64748B] uppercase">
            High-Impact Signal Feed
          </span>
          {alerts.length > 0 && (
            <span className="text-[0.6rem] font-bold text-[#EF4444] bg-[#EF4444]/10 px-2 py-0.5 rounded-full border border-[#EF4444]/30 ml-auto">
              {alerts.length} Active
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-[#0A0E17]/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8">
            <Zap className="w-8 h-8 text-[#334155] mx-auto mb-2" />
            <p className="text-sm text-[#64748B]">No high-impact signals detected</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((h) => {
              const sevColor =
                h.impact_score >= 80
                  ? "border-[#EF4444]/30 bg-[#EF4444]/5"
                  : "border-[#F59E0B]/30 bg-[#F59E0B]/5";
              const sevText =
                h.impact_score >= 80 ? "text-[#EF4444]" : "text-[#F59E0B]";
              return (
                <div
                  key={h.id}
                  className={`border rounded-lg p-3 ${sevColor}`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${sevText}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium line-clamp-2 ${sevText}`}>
                        {h.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[0.6rem] text-[#475569]">
                        <span>{h.source}</span>
                        <span>{h.event_type}</span>
                        <span className="font-bold">
                          Impact {h.impact_score.toFixed(0)}
                        </span>
                        <span>
                          {new Date(h.published_at).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
