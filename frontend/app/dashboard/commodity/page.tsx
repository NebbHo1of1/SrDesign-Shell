/* ── SIGNAL — Commodity View Page ─────────────────────────────────────
   Price chart with event markers, prediction card, and sentiment
   overlay.  Commodity selector to switch between WTI / BRENT.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useEffect, useState } from "react";
import { api, type Headline, type KPIs, type PriceSeries } from "@/lib/api";
import PriceChart from "@/components/PriceChart";
import SignalPanel from "@/components/SignalPanel";

const COMMODITIES = ["WTI", "BRENT"];
const RANGES: { label: string; value: string }[] = [
  { label: "7 Days", value: "7d" },
  { label: "14 Days", value: "14d" },
  { label: "30 Days", value: "30d" },
];

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
    setReqId((n) => n + 1);
  }
  function handleRangeChange(r: string) {
    setRange(r);
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

  return (
    <div className="space-y-6">
      {/* Header + controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-extrabold text-[#F8FAFC]">
          Commodity View — {commodity}
        </h1>
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

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PriceChart prices={prices} headlines={headlines} loading={loading} />
        </div>
        <div className="lg:col-span-1">
          <SignalPanel kpi={kpi} headline={headlines[0]} loading={loading} />
        </div>
      </div>
    </div>
  );
}
