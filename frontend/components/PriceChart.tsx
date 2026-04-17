/* ── SIGNAL — Price Chart ─────────────────────────────────────────────
   Commodity price line chart with news event markers. Built with
   Recharts for a clean, dark-themed, responsive chart.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import type { Headline, PriceSeries } from "@/lib/api";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceDot,
  CartesianGrid,
} from "recharts";
import { TrendingUp } from "lucide-react";

interface Props {
  prices: PriceSeries | null;
  headlines: Headline[];
  loading: boolean;
}

export default function PriceChart({ prices, headlines, loading }: Props) {
  if (loading || !prices) {
    return (
      <div className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-xl p-5 h-80 animate-pulse">
        <div className="h-4 w-40 bg-[#334155] rounded mb-4" />
        <div className="h-56 bg-[#0A0E17]/50 rounded-lg" />
      </div>
    );
  }

  const data = prices.points.map((p) => ({
    date: new Date(p.timestamp).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    }),
    timestamp: p.timestamp,
    close: p.close,
  }));

  // Find high-impact headlines that align with price dates
  const markerHeadlines = headlines
    .filter((h) => h.impact_score >= 65)
    .slice(0, 5);

  // Map markers to closest data point
  const markers = markerHeadlines
    .map((h) => {
      const hTime = new Date(h.published_at).getTime();
      let closest = data[0];
      let minDiff = Infinity;
      for (const d of data) {
        const diff = Math.abs(new Date(d.timestamp).getTime() - hTime);
        if (diff < minDiff) {
          minDiff = diff;
          closest = d;
        }
      }
      return { ...closest, headline: h };
    })
    .filter((m) => m.close != null);

  return (
    <div className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#38BDF8]" />
          <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[#64748B] uppercase">
            {prices.commodity} — Price &amp; Events
          </span>
        </div>
        <span className="text-xs text-[#475569]">
          {data.length} data points
        </span>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
          <XAxis
            dataKey="date"
            stroke="#334155"
            tick={{ fill: "#64748B", fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            stroke="#334155"
            tick={{ fill: "#64748B", fontSize: 11 }}
            tickLine={false}
            domain={["auto", "auto"]}
            width={50}
          />
          <Tooltip
            contentStyle={{
              background: "#1A2234",
              border: "1px solid #1E293B",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#E2E8F0",
            }}
          />
          <Area
            type="monotone"
            dataKey="close"
            stroke="#38BDF8"
            strokeWidth={2}
            fill="url(#priceGrad)"
          />
          {/* Event markers */}
          {markers.map((m, i) => (
            <ReferenceDot
              key={i}
              x={m.date}
              y={m.close}
              r={5}
              fill={
                m.headline.sentiment_score > 0.15
                  ? "#22C55E"
                  : m.headline.sentiment_score < -0.15
                    ? "#EF4444"
                    : "#F59E0B"
              }
              stroke="#0A0E17"
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      {/* Event markers legend */}
      {markers.length > 0 && (
        <div className="mt-3 space-y-1">
          {markers.map((m, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-[0.65rem] text-[#94A3B8]"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  background:
                    m.headline.sentiment_score > 0.15
                      ? "#22C55E"
                      : m.headline.sentiment_score < -0.15
                        ? "#EF4444"
                        : "#F59E0B",
                }}
              />
              <span className="truncate">{m.headline.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
