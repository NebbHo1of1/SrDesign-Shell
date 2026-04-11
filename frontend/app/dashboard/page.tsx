/* ── SIGNAL — Command Center (Main Dashboard) ────────────────────────
   KPI cards, AI signal panel, news feed, price chart, alerts.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { api, type Headline, type KPIs, type PriceSeries } from "@/lib/api";
import KPICards from "@/components/KPICards";
import SignalPanel from "@/components/SignalPanel";
import NewsPanel from "@/components/NewsPanel";
import PriceChart from "@/components/PriceChart";
import AlertsPanel from "@/components/AlertsPanel";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function DashboardPage() {
  const { user } = useAuth();

  const [kpiWTI, setKpiWTI] = useState<KPIs | null>(null);
  const [kpiBrent, setKpiBrent] = useState<KPIs | null>(null);
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [prices, setPrices] = useState<PriceSeries | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [wti, brent, news, priceData] = await Promise.all([
          api.kpis("WTI").catch((e) => { console.warn("[SIGNAL] KPI WTI fetch failed:", e.message); return null; }),
          api.kpis("BRENT").catch((e) => { console.warn("[SIGNAL] KPI BRENT fetch failed:", e.message); return null; }),
          api.headlines("WTI", 30).catch((e) => { console.warn("[SIGNAL] Headlines fetch failed:", e.message); return []; }),
          api.prices("WTI", "14d").catch((e) => { console.warn("[SIGNAL] Prices fetch failed:", e.message); return null; }),
        ]);
        console.log("[SIGNAL] Dashboard data loaded:", {
          kpiWTI: wti,
          kpiBrent: brent,
          headlines: news?.length ?? 0,
          prices: priceData?.points?.length ?? 0,
        });
        setKpiWTI(wti);
        setKpiBrent(brent);
        setHeadlines(news);
        setPrices(priceData);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (!user) return null;

  /* Compute greeting — safe because this only renders client-side (behind auth gate) */
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  /* Format current time once (live clock is in TopBar) */
  const systemTime = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* ── Greeting ─────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <div className="relative bg-gradient-to-r from-[#0D1321] via-[#1A2234] to-[#111827] border border-[#1E293B] rounded-2xl p-6 overflow-hidden">
          {/* Top accent */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#DD1D21] via-[#FBCE07] to-[#38BDF8]" />
          <h1 className="text-2xl font-extrabold text-[#F8FAFC]">
            {greeting},{" "}
            <span className="bg-gradient-to-r from-[#FBCE07] to-[#38BDF8] bg-clip-text text-transparent">
              {user.name.split(" ")[0]}
            </span>
            .
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            SIGNAL is{" "}
            <span className="text-[#22C55E] font-semibold">online</span>.
            Monitoring global oil markets and geopolitical activity.
          </p>
          <div className="flex items-center gap-2 mt-3 text-xs text-[#64748B]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse-dot" />
            Systems Operational
            <span className="mx-1">•</span>
            {systemTime} UTC
          </div>
        </div>
      </motion.div>

      {/* ── KPI Cards Row ────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <KPICards wti={kpiWTI} brent={kpiBrent} loading={loading} />
      </motion.div>

      {/* ── Two-column: Signal + News ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={fadeUp} className="lg:col-span-1">
          <SignalPanel kpi={kpiWTI} headline={headlines[0]} loading={loading} />
        </motion.div>
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <NewsPanel headlines={headlines} loading={loading} />
        </motion.div>
      </div>

      {/* ── Price Chart + Alerts ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <PriceChart prices={prices} headlines={headlines} loading={loading} />
        </motion.div>
        <motion.div variants={fadeUp} className="lg:col-span-1">
          <AlertsPanel headlines={headlines} loading={loading} />
        </motion.div>
      </div>
    </motion.div>
  );
}
