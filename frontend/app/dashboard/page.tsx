/* ── SIGNAL — Command Center (Main Dashboard) ────────────────────────
   KPI cards, AI signal panel, news feed, price chart, alerts.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { api, type Headline, type KPIs, type PriceSeries } from "@/lib/api";
import KPICards from "@/components/KPICards";
import SignalPanel from "@/components/SignalPanel";
import NewsPanel from "@/components/NewsPanel";
import PriceChart from "@/components/PriceChart";
import AlertsPanel from "@/components/AlertsPanel";
import { RefreshCw, AlertTriangle, Database } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wti, brent, news, priceData] = await Promise.all([
        api.kpis("WTI").catch((e) => { console.warn("[SIGNAL] KPI WTI fetch failed:", e.message); return null; }),
        api.kpis("BRENT").catch((e) => { console.warn("[SIGNAL] KPI BRENT fetch failed:", e.message); return null; }),
        api.headlines("WTI", 30).catch((e) => {
          console.warn("[SIGNAL] Headlines fetch failed:", e.message);
          throw e; // re-throw to trigger error state
        }),
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

      // If API is reachable but returned no headlines, auto-seed
      if (news.length === 0) {
        console.log("[SIGNAL] No headlines found — auto-seeding…");
        setSeeding(true);
        try {
          await api.seed();
          // Re-fetch after seed
          const [freshNews, freshWti, freshBrent, freshPrices] = await Promise.all([
            api.headlines("WTI", 30).catch(() => []),
            api.kpis("WTI").catch(() => null),
            api.kpis("BRENT").catch(() => null),
            api.prices("WTI", "14d").catch(() => null),
          ]);
          setHeadlines(freshNews);
          setKpiWTI(freshWti);
          setKpiBrent(freshBrent);
          setPrices(freshPrices);
        } catch (seedErr) {
          console.warn("[SIGNAL] Auto-seed failed:", seedErr);
        } finally {
          setSeeding(false);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load data";
      setError(msg);
      setHeadlines([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await api.seed();
      await load();
    } catch (err) {
      console.warn("[SIGNAL] Refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* ── Error Banner ─────────────────────────────────────── */}
      {error && (
        <motion.div variants={fadeUp}>
          <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#EF4444]">
                Unable to load data
              </p>
              <p className="text-xs text-[#F87171] mt-0.5">{error}</p>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#F8FAFC] bg-[#EF4444]/20 hover:bg-[#EF4444]/30 border border-[#EF4444]/40 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              Retry
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Seeding Banner ────────────────────────────────────── */}
      {seeding && (
        <motion.div variants={fadeUp}>
          <div className="bg-[#38BDF8]/10 border border-[#38BDF8]/30 rounded-xl p-4 flex items-center gap-3">
            <Database className="w-5 h-5 text-[#38BDF8] shrink-0 animate-pulse" />
            <p className="text-sm text-[#38BDF8]">
              No data found — seeding database with initial data…
            </p>
          </div>
        </motion.div>
      )}

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
            <span className="mx-1">•</span>
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              aria-label="Refresh dashboard data"
              className="inline-flex items-center gap-1 text-[#38BDF8] hover:text-[#7DD3FC] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing…" : "Refresh Data"}
            </button>
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
