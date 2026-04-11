/* ── SIGNAL — Commodity View Page ─────────────────────────────────────
   Comprehensive commodity dashboard: KPI cards, price chart with event
   markers, AI signal panel, sentiment breakdown, recent news, alerts,
   and price statistics.  Commodity selector to switch WTI / BRENT.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type Headline, type KPIs, type PriceSeries } from "@/lib/api";
import PriceChart from "@/components/PriceChart";
import SignalPanel from "@/components/SignalPanel";
import AlertsPanel from "@/components/AlertsPanel";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Newspaper,
  DollarSign,
  Gauge,
  Minus,
} from "lucide-react";

const COMMODITIES = ["WTI", "BRENT"];
const RANGES: { label: string; value: string }[] = [
  { label: "7 Days", value: "7d" },
  { label: "14 Days", value: "14d" },
  { label: "30 Days", value: "30d" },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

/* ── Sentiment breakdown helper ────────────────────────────────────── */
function computeSentimentBreakdown(headlines: Headline[]) {
  let positive = 0;
  let negative = 0;
  let neutral = 0;
  for (const h of headlines) {
    if (h.sentiment_score > 0.15) positive++;
    else if (h.sentiment_score < -0.15) negative++;
    else neutral++;
  }
  const total = headlines.length || 1;
  return {
    positive,
    negative,
    neutral,
    positivePct: Math.round((positive / total) * 100),
    negativePct: Math.round((negative / total) * 100),
    neutralPct: Math.round((neutral / total) * 100),
  };
}

/* ── Price statistics helper ───────────────────────────────────────── */
function computePriceStats(prices: PriceSeries | null) {
  if (!prices || prices.points.length === 0) return null;
  const closes = prices.points.map((p) => p.close);
  const high = Math.max(...closes);
  const low = Math.min(...closes);
  const avg = closes.reduce((a, b) => a + b, 0) / closes.length;
  const first = closes[0];
  const last = closes[closes.length - 1];
  const change = last - first;
  const changePct = first !== 0 ? (change / first) * 100 : 0;
  return { high, low, avg, latest: last, change, changePct };
}

export default function CommodityPage() {
  const [commodity, setCommodity] = useState("WTI");
  const [range, setRange] = useState("14d");
  const [prices, setPrices] = useState<PriceSeries | null>(null);
  const [kpi, setKpi] = useState<KPIs | null>(null);
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [loading, setLoading] = useState(true);
  /* Track request generation to detect stale responses */
  const [reqId, setReqId] = useState(0);

  /* Trigger a new fetch when commodity or range changes */
  function handleCommodityChange(c: string) {
    setCommodity(c);
    setLoading(true);
    setReqId((n) => n + 1);
  }
  function handleRangeChange(r: string) {
    setRange(r);
    setLoading(true);
    setReqId((n) => n + 1);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.prices(commodity, range).catch(() => null),
      api.kpis(commodity).catch(() => null),
      api.headlines(commodity, 50).catch(() => []),
    ])
      .then(([p, k, h]) => {
        if (cancelled) return;
        setPrices(p);
        setKpi(k);
        setHeadlines(h);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [commodity, range, reqId]);

  const sentimentBreakdown = computeSentimentBreakdown(headlines);
  const priceStats = computePriceStats(prices);

  /* Derived KPI values */
  const pred = kpi?.model_prediction ?? kpi?.last_prediction ?? "—";
  const conf = kpi?.model_confidence ?? kpi?.last_confidence ?? 0;
  const confPct = Math.round(conf * 100);
  const sentiment = kpi?.avg_sentiment_24h ?? 0;

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* ── Header + Controls ─────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <div className="relative bg-gradient-to-r from-[#0D1321] via-[#1A2234] to-[#111827] border border-[#1E293B] rounded-2xl p-6 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#DD1D21] via-[#FBCE07] to-[#38BDF8]" />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-[#F8FAFC]">
                Commodity View —{" "}
                <span className="bg-gradient-to-r from-[#FBCE07] to-[#38BDF8] bg-clip-text text-transparent">
                  {commodity}
                </span>
              </h1>
              <p className="text-sm text-[#94A3B8] mt-1">
                Comprehensive price, sentiment, and signal analysis for {commodity} crude oil.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {COMMODITIES.map((c) => (
                <button
                  key={c}
                  onClick={() => handleCommodityChange(c)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-semibold ${
                    commodity === c
                      ? "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/40"
                      : "text-[#64748B] border-[#1E293B] hover:border-[#334155]"
                  }`}
                >
                  {c}
                </button>
              ))}
              <span className="text-[#334155] mx-1">|</span>
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => handleRangeChange(r.value)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    range === r.value
                      ? "bg-[#FBCE07]/10 text-[#FBCE07] border-[#FBCE07]/40"
                      : "text-[#64748B] border-[#1E293B] hover:border-[#334155]"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── KPI Summary Cards ─────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Latest Price */}
          <div className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#38BDF8]/30 rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-[#38BDF8]/5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[0.6rem] font-bold tracking-[0.1em] text-[#64748B] uppercase">Latest Price</span>
              <DollarSign className="w-5 h-5 text-[#38BDF8]" />
            </div>
            {loading ? (
              <div className="h-7 w-20 bg-[#334155] rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-extrabold text-[#38BDF8]">
                  ${priceStats?.latest.toFixed(2) ?? "—"}
                </div>
                {priceStats && (
                  <p className={`text-xs mt-1 font-semibold ${priceStats.change >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                    {priceStats.change >= 0 ? "+" : ""}{priceStats.change.toFixed(2)} ({priceStats.changePct >= 0 ? "+" : ""}{priceStats.changePct.toFixed(1)}%)
                  </p>
                )}
              </>
            )}
          </div>

          {/* Market Direction */}
          <div className={`bg-gradient-to-br from-[#1A2234] to-[#1E293B] border rounded-xl p-5 transition-all hover:shadow-lg ${
            pred === "UP" ? "border-[#22C55E]/30 hover:shadow-[#22C55E]/5" : pred === "DOWN" ? "border-[#EF4444]/30 hover:shadow-[#EF4444]/5" : "border-[#F59E0B]/30 hover:shadow-[#F59E0B]/5"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[0.6rem] font-bold tracking-[0.1em] text-[#64748B] uppercase">Market Signal</span>
              {pred === "UP" ? <TrendingUp className="w-5 h-5 text-[#22C55E]" /> : pred === "DOWN" ? <TrendingDown className="w-5 h-5 text-[#EF4444]" /> : <Activity className="w-5 h-5 text-[#F59E0B]" />}
            </div>
            {loading ? (
              <div className="h-7 w-16 bg-[#334155] rounded animate-pulse" />
            ) : (
              <>
                <div className={`text-2xl font-extrabold ${pred === "UP" ? "text-[#22C55E]" : pred === "DOWN" ? "text-[#EF4444]" : "text-[#F59E0B]"}`}>{pred}</div>
                <p className="text-xs text-[#64748B] mt-1">{kpi?.model_prediction ? "AI Model" : "Headline-based"}</p>
              </>
            )}
          </div>

          {/* Confidence */}
          <div className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#A78BFA]/30 rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-[#A78BFA]/5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[0.6rem] font-bold tracking-[0.1em] text-[#64748B] uppercase">Confidence</span>
              <Gauge className="w-5 h-5 text-[#A78BFA]" />
            </div>
            {loading ? (
              <div className="h-7 w-16 bg-[#334155] rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-extrabold text-[#A78BFA]">{confPct}%</div>
                <p className="text-xs text-[#64748B] mt-1">{confPct >= 75 ? "High confidence" : confPct >= 55 ? "Moderate" : "Low confidence"}</p>
              </>
            )}
          </div>

          {/* Avg Sentiment */}
          <div className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#F59E0B]/30 rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-[#F59E0B]/5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[0.6rem] font-bold tracking-[0.1em] text-[#64748B] uppercase">Avg Sentiment</span>
              <BarChart3 className="w-5 h-5 text-[#F59E0B]" />
            </div>
            {loading ? (
              <div className="h-7 w-16 bg-[#334155] rounded animate-pulse" />
            ) : (
              <>
                <div className={`text-2xl font-extrabold ${sentiment > 0.1 ? "text-[#22C55E]" : sentiment < -0.1 ? "text-[#EF4444]" : "text-[#94A3B8]"}`}>
                  {sentiment > 0 ? "+" : ""}{sentiment.toFixed(3)}
                </div>
                <p className="text-xs text-[#64748B] mt-1">{kpi?.total_headlines_24h ?? 0} headlines analyzed</p>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Price Chart + Signal Panel ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <PriceChart prices={prices} headlines={headlines} loading={loading} />
        </motion.div>
        <motion.div variants={fadeUp} className="lg:col-span-1">
          <SignalPanel kpi={kpi} headline={headlines[0]} loading={loading} commodity={commodity} />
        </motion.div>
      </div>

      {/* ── Price Stats + Sentiment Breakdown ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Statistics */}
        <motion.div variants={fadeUp}>
          <div className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4 text-[#38BDF8]" />
              <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[#64748B] uppercase">
                Price Statistics — {range.replace("d", " Day")}
              </span>
            </div>
            {loading || !priceStats ? (
              <div className="space-y-3 animate-pulse">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-4 bg-[#334155] rounded w-3/4" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0A0E17]/50 rounded-lg p-3">
                  <p className="text-[0.6rem] text-[#475569] uppercase tracking-wide mb-1">Period High</p>
                  <p className="text-lg font-bold text-[#22C55E]">${priceStats.high.toFixed(2)}</p>
                </div>
                <div className="bg-[#0A0E17]/50 rounded-lg p-3">
                  <p className="text-[0.6rem] text-[#475569] uppercase tracking-wide mb-1">Period Low</p>
                  <p className="text-lg font-bold text-[#EF4444]">${priceStats.low.toFixed(2)}</p>
                </div>
                <div className="bg-[#0A0E17]/50 rounded-lg p-3">
                  <p className="text-[0.6rem] text-[#475569] uppercase tracking-wide mb-1">Average</p>
                  <p className="text-lg font-bold text-[#94A3B8]">${priceStats.avg.toFixed(2)}</p>
                </div>
                <div className="bg-[#0A0E17]/50 rounded-lg p-3">
                  <p className="text-[0.6rem] text-[#475569] uppercase tracking-wide mb-1">Spread (H-L)</p>
                  <p className="text-lg font-bold text-[#F59E0B]">${(priceStats.high - priceStats.low).toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Sentiment Breakdown */}
        <motion.div variants={fadeUp}>
          <div className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-[#FBCE07]" />
              <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[#64748B] uppercase">
                Sentiment Breakdown — {headlines.length} Headlines
              </span>
            </div>
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-6 bg-[#334155] rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Positive */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#22C55E] font-semibold">Positive</span>
                    <span className="text-[#94A3B8]">{sentimentBreakdown.positive} ({sentimentBreakdown.positivePct}%)</span>
                  </div>
                  <div className="h-2.5 bg-[#0A0E17] rounded-full overflow-hidden">
                    <div className="h-full bg-[#22C55E] rounded-full transition-all duration-700" style={{ width: `${sentimentBreakdown.positivePct}%` }} />
                  </div>
                </div>
                {/* Neutral */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#F59E0B] font-semibold">Neutral</span>
                    <span className="text-[#94A3B8]">{sentimentBreakdown.neutral} ({sentimentBreakdown.neutralPct}%)</span>
                  </div>
                  <div className="h-2.5 bg-[#0A0E17] rounded-full overflow-hidden">
                    <div className="h-full bg-[#F59E0B] rounded-full transition-all duration-700" style={{ width: `${sentimentBreakdown.neutralPct}%` }} />
                  </div>
                </div>
                {/* Negative */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#EF4444] font-semibold">Negative</span>
                    <span className="text-[#94A3B8]">{sentimentBreakdown.negative} ({sentimentBreakdown.negativePct}%)</span>
                  </div>
                  <div className="h-2.5 bg-[#0A0E17] rounded-full overflow-hidden">
                    <div className="h-full bg-[#EF4444] rounded-full transition-all duration-700" style={{ width: `${sentimentBreakdown.negativePct}%` }} />
                  </div>
                </div>
                {/* Summary */}
                <div className="pt-2 border-t border-[#1E293B]">
                  <p className="text-xs text-[#64748B]">
                    Overall sentiment is{" "}
                    <span className={`font-bold ${sentimentBreakdown.positivePct > sentimentBreakdown.negativePct ? "text-[#22C55E]" : sentimentBreakdown.negativePct > sentimentBreakdown.positivePct ? "text-[#EF4444]" : "text-[#F59E0B]"}`}>
                      {sentimentBreakdown.positivePct > sentimentBreakdown.negativePct ? "bullish" : sentimentBreakdown.negativePct > sentimentBreakdown.positivePct ? "bearish" : "neutral"}
                    </span>
                    {" "}for {commodity}.
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Recent News + Alerts ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Headlines */}
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <div className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-[#38BDF8]" />
                <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[#64748B] uppercase">
                  Recent {commodity} Headlines
                </span>
              </div>
              <span className="flex items-center gap-1.5 text-[0.6rem] text-[#22C55E]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                Live
              </span>
            </div>
            {loading ? (
              <div className="space-y-2 animate-pulse">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 bg-[#0A0E17]/50 rounded-lg" />
                ))}
              </div>
            ) : headlines.length === 0 ? (
              <p className="text-sm text-[#64748B] text-center py-8">No headlines available for {commodity}.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {headlines.slice(0, 10).map((h) => {
                  const sentColor =
                    h.sentiment_score > 0.15 ? "text-[#22C55E]" : h.sentiment_score < -0.15 ? "text-[#EF4444]" : "text-[#F59E0B]";
                  const sentLabel =
                    h.sentiment_score > 0.15 ? "Positive" : h.sentiment_score < -0.15 ? "Negative" : "Neutral";
                  const predCfg =
                    h.pred_label === "UP"
                      ? { icon: <TrendingUp className="w-3 h-3" />, cls: "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30" }
                      : h.pred_label === "DOWN"
                        ? { icon: <TrendingDown className="w-3 h-3" />, cls: "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30" }
                        : { icon: <Minus className="w-3 h-3" />, cls: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30" };
                  const impactClass =
                    h.impact_score >= 70 ? "text-[#EF4444]" : h.impact_score >= 40 ? "text-[#F59E0B]" : "text-[#22C55E]";

                  return (
                    <a
                      key={h.id}
                      href={h.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-[#0A0E17]/50 border border-[#1E293B] rounded-lg p-3 hover:border-[#38BDF8]/50 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#F8FAFC] font-semibold leading-snug line-clamp-2 group-hover:text-[#38BDF8] transition-colors">
                            {h.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[0.6rem] text-[#475569]">{h.source}</span>
                            <span className="text-[0.6rem] text-[#334155]">•</span>
                            <span className="text-[0.6rem] text-[#475569]">{h.event_type}</span>
                            <span className="text-[0.6rem] text-[#334155]">•</span>
                            <span className={`text-[0.6rem] font-semibold ${impactClass}`}>Impact {h.impact_score.toFixed(0)}</span>
                            <span className="text-[0.6rem] text-[#334155]">•</span>
                            <span className={`text-[0.6rem] font-semibold ${sentColor}`}>{sentLabel}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className={`inline-flex items-center gap-1 text-[0.6rem] font-bold px-2 py-0.5 rounded-full border ${predCfg.cls}`}>
                            {predCfg.icon}
                            {h.pred_label}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 h-[3px] bg-[#1E293B] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(5, ((h.sentiment_score + 1) / 2) * 100)}%`,
                            background: h.sentiment_score > 0.15 ? "#22C55E" : h.sentiment_score < -0.15 ? "#EF4444" : "#F59E0B",
                          }}
                        />
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Alerts Panel */}
        <motion.div variants={fadeUp} className="lg:col-span-1">
          <AlertsPanel headlines={headlines} loading={loading} />
        </motion.div>
      </div>
    </motion.div>
  );
}
