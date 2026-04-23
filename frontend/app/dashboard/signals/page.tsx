/* ── SIGNAL — Signal Engine Page ──────────────────────────────────────
   Risk meter, market status board, alert feed, volatility tracker.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useEffect, useState } from "react";
import { api, type Headline, type KPIs } from "@/lib/api";
import RoleGate from "@/components/RoleGate";
import {
  AlertTriangle,
  Zap,
  Shield,
  Activity,
  Globe,
  TrendingUp,
  TrendingDown,
  RefreshCw,
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
    <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4 text-[#EF4444]" />
        <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase">
          Risk Level
        </span>
      </div>
      <div className={`text-3xl font-extrabold ${color} mb-1`}>{label}</div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-[var(--shell-bg)] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
            style={{ width: `${Math.min(100, score)}%` }}
          />
        </div>
        <span className="text-xs text-[var(--shell-muted)] font-mono">
          {score.toFixed(0)}
        </span>
      </div>
    </div>
  );
}

const COMMODITIES = ["WTI", "BRENT"];

export default function SignalsPage() {
  const [commodity, setCommodity] = useState("WTI");
  const [kpi, setKpi] = useState<KPIs | null>(null);
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.kpis(commodity).catch(() => null),
      api.headlines(commodity, 50),
    ])
      .then(([k, h]) => {
        setKpi(k);
        setHeadlines(h);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load data");
        setHeadlines([]);
      })
      .finally(() => setLoading(false));
  }, [commodity, retryKey]);

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
    <RoleGate page="/dashboard/signals">
    <div className="space-y-6">
      {/* ── Error Banner ─────────────────────────────────────── */}
      {error && (
        <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#EF4444]">Unable to load data</p>
            <p className="text-xs text-[#F87171] mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => setRetryKey((n) => n + 1)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--shell-text-bright)] bg-[#EF4444]/20 hover:bg-[#EF4444]/30 border border-[#EF4444]/40 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            Retry
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-[#FBCE07]" />
          <h1 className="text-xl font-extrabold text-[var(--shell-text-bright)]">
            Signal Engine
          </h1>
        </div>
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

      {/* Top row: Risk + Market Status + Volatility */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RiskMeter score={riskScore} />

        {/* Market Status */}
        <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-[#38BDF8]" />
            <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase">
              Market Status — {commodity}
            </span>
          </div>
          <div className={`flex items-center gap-2 ${marketStatus.color}`}>
            {marketStatus.icon}
            <span className="text-3xl font-extrabold">{marketStatus.label}</span>
          </div>
          <p className="text-xs text-[var(--shell-muted-2)] mt-2">
            Confidence:{" "}
            {kpi?.last_confidence != null
              ? `${(kpi.last_confidence * 100).toFixed(0)}%`
              : "—"}
          </p>
        </div>

        {/* 24h Summary */}
        <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-[#06B6D4]" />
            <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase">
              24h Intelligence
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--shell-muted)]">Headlines</span>
              <span className="text-[var(--shell-text-bright)] font-bold">
                {kpi?.total_headlines_24h ?? 0}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--shell-muted)]">High Impact</span>
              <span className="text-[#EF4444] font-bold">{highImpact}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--shell-muted)]">Avg Sentiment</span>
              <span
                className={`font-bold ${
                  sentiment > 0.1
                    ? "text-[#22C55E]"
                    : sentiment < -0.1
                      ? "text-[#EF4444]"
                      : "text-[var(--shell-muted)]"
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
      <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
          <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase">
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
              <div key={i} className="h-16 bg-[var(--shell-bg)]/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8">
            <Zap className="w-8 h-8 text-[var(--shell-border-2)] mx-auto mb-2" />
            <p className="text-sm text-[var(--shell-muted-2)]">No high-impact signals detected</p>
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
                      <div className="flex items-center gap-3 mt-1 text-[0.6rem] text-[var(--shell-muted-3)]">
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
    </RoleGate>
  );
}
