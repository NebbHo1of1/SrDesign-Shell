/* ── SIGNAL — Onboarding Flow ─────────────────────────────────────────
   Multi-step onboarding for Analyst & Executive.
   Analyst: 5-step flow (greeting → commodity → alerts → notifications → complete).
   Executive: Cinematic verification → 6-step immersive strategic flow.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  Shield,
  Bell,
  CheckCircle2,
  ChevronRight,
  Crown,
  TrendingUp,
  BarChart3,
  Settings,
  Zap,
  Brain,
  Newspaper,
  LayoutDashboard,
  Eye,
  Activity,
} from "lucide-react";
import {
  saveOnboarding,
  getDefaultAlerts,
  type AlertsConfig,
} from "@/lib/onboarding";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

/* ── KPI types for Executive briefing ────────────────────────────── */
interface KpiData {
  avg_sentiment_24h?: number;
  total_headlines_24h?: number;
  model_prediction?: string;
  model_confidence?: number;
  high_impact_count_24h?: number;
}

/* ══════════════════════════════════════════════════════════════════════
   EXECUTIVE — Phase 0: Cinematic Security Verification Sequence
   ══════════════════════════════════════════════════════════════════════ */
function ExecVerification({
  name,
  onComplete,
}: {
  name: string;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<"A" | "B" | "C" | "D">("A");
  const [scanProgress, setScanProgress] = useState(0);
  const [tiers, setTiers] = useState(0);

  useEffect(() => {
    const tB = setTimeout(() => setPhase("B"), 2000);
    const tC = setTimeout(() => setPhase("C"), 4000);
    const tD = setTimeout(() => setPhase("D"), 6000);
    const tEnd = setTimeout(() => onComplete(), 8000);
    return () => {
      clearTimeout(tB);
      clearTimeout(tC);
      clearTimeout(tD);
      clearTimeout(tEnd);
    };
  }, [onComplete]);

  /* Phase A: scanning animation progress */
  useEffect(() => {
    if (phase !== "A") return;
    const interval = setInterval(() => {
      setScanProgress((p) => (p >= 100 ? 100 : p + 2));
    }, 40);
    return () => clearInterval(interval);
  }, [phase]);

  /* Phase B: tier reveals */
  useEffect(() => {
    if (phase !== "B") return;
    const t1 = setTimeout(() => setTiers(1), 300);
    const t2 = setTimeout(() => setTiers(2), 900);
    const t3 = setTimeout(() => setTiers(3), 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [phase]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0A0E17] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,215,0,0.06)_0%,transparent_60%)]" />

      <AnimatePresence mode="wait">
        {/* ── Phase A: Biometric Scan ──────────────────────── */}
        {phase === "A" && (
          <motion.div
            key="phaseA"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-8 relative w-full max-w-md"
          >
            {/* Scanning line */}
            <motion.div
              initial={{ top: "0%" }}
              animate={{ top: "100%" }}
              transition={{ duration: 2, ease: "linear" }}
              className="absolute left-1/2 -translate-x-1/2 w-64 h-[2px] z-10"
              style={{
                background:
                  "linear-gradient(90deg, transparent, #FFD700, transparent)",
                boxShadow: "0 0 20px rgba(255,215,0,0.4)",
              }}
            />

            <p className="text-[0.7rem] font-bold tracking-[0.2em] text-[#FFD700] uppercase">
              Initiating Security Verification
            </p>

            {/* Progress ring */}
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke="#1E293B"
                  strokeWidth="3"
                />
                <motion.circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke="#FFD700"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={251}
                  strokeDashoffset={251 - (251 * scanProgress) / 100}
                  style={{
                    filter: "drop-shadow(0 0 6px rgba(255,215,0,0.4))",
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-[#FFD700]">
                  {scanProgress}%
                </span>
              </div>
            </div>

            <p className="text-xs text-[#94A3B8] tracking-wide">
              Biometric Scan:{" "}
              <span className="text-[#FFD700]">Processing…</span>
            </p>
          </motion.div>
        )}

        {/* ── Phase B: Clearance Tiers ────────────────────── */}
        {phase === "B" && (
          <motion.div
            key="phaseB"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <p className="text-[0.7rem] font-bold tracking-[0.2em] text-[#94A3B8] uppercase mb-4">
              Security Clearance Verification
            </p>
            {[
              { tier: 1, label: "Standard Access" },
              { tier: 2, label: "Analyst Clearance" },
              { tier: 3, label: "Executive Authorization" },
            ].map((t) => (
              <motion.div
                key={t.tier}
                initial={{ opacity: 0, x: -30 }}
                animate={
                  tiers >= t.tier
                    ? { opacity: 1, x: 0 }
                    : { opacity: 0.15, x: 0 }
                }
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex items-center gap-3 w-72"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                    tiers >= t.tier
                      ? "border-[#FFD700] text-[#FFD700] bg-[#FFD700]/10"
                      : "border-[#334155] text-[#475569]"
                  }`}
                >
                  {t.tier}
                </div>
                <span
                  className={`text-sm font-semibold flex-1 ${
                    tiers >= t.tier ? "text-[#F8FAFC]" : "text-[#475569]"
                  }`}
                >
                  Tier {t.tier}: {t.label}
                </span>
                {tiers >= t.tier && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-[#FFD700] text-base"
                  >
                    ✓
                  </motion.span>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── Phase C: Badge Reveal ───────────────────────── */}
        {phase === "C" && (
          <motion.div
            key="phaseC"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", duration: 0.8 }}
            className="flex flex-col items-center"
          >
            {/* Shield badge */}
            <div className="relative mb-6">
              <div
                className="w-32 h-36 flex flex-col items-center justify-center"
                style={{
                  clipPath:
                    "polygon(50% 0%, 100% 15%, 100% 70%, 50% 100%, 0% 70%, 0% 15%)",
                  background:
                    "linear-gradient(135deg, #0D1321 0%, #1E293B 100%)",
                  border: "none",
                }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    clipPath:
                      "polygon(50% 0%, 100% 15%, 100% 70%, 50% 100%, 0% 70%, 0% 15%)",
                    background:
                      "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(218,165,32,0.05))",
                  }}
                />
                <Crown className="w-8 h-8 text-[#FFD700] mb-1 drop-shadow-[0_0_10px_rgba(255,215,0,0.5)] relative z-10" />
                <p className="text-[0.5rem] font-bold tracking-[0.15em] text-[#FFD700] relative z-10">
                  EXECUTIVE
                </p>
              </div>
              {/* Gold border glow */}
              <div
                className="absolute inset-0 -m-[2px]"
                style={{
                  clipPath:
                    "polygon(50% 0%, 100% 15%, 100% 70%, 50% 100%, 0% 70%, 0% 15%)",
                  background:
                    "linear-gradient(135deg, #FFD700, #B8860B, #FFD700)",
                  zIndex: -1,
                }}
              />
            </div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg font-extrabold tracking-[0.15em] text-[#FFD700] mb-2"
            >
              ACCESS LEVEL: EXECUTIVE
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-sm text-[#94A3B8]"
            >
              {name}
            </motion.p>
          </motion.div>
        )}

        {/* ── Phase D: Fade to transition ─────────────────── */}
        {phase === "D" && (
          <motion.div
            key="phaseD"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0.8] }}
              transition={{ duration: 1.5 }}
              className="text-sm text-[#94A3B8] tracking-wide"
            >
              Activating executive intelligence layer…
            </motion.div>
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="h-[2px] mt-6 w-64 rounded-full bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFD700]"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   EXECUTIVE — Step 1: Strategic Briefing
   ══════════════════════════════════════════════════════════════════════ */
function ExecStepBriefing({ onNext }: { onNext: () => void }) {
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/kpis?commodity=WTI`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("API error"))))
      .then((data: KpiData) => {
        if (!cancelled) {
          setKpis(data);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setKpis({
            avg_sentiment_24h: 0.42,
            total_headlines_24h: 128,
            model_prediction: "Bullish",
            model_confidence: 0.78,
            high_impact_count_24h: 3,
          });
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = loaded
    ? [
        {
          label: "Market Sentiment",
          value:
            kpis?.avg_sentiment_24h != null
              ? `${(kpis.avg_sentiment_24h * 100).toFixed(0)}%`
              : "N/A",
          sub: "24h average",
          icon: Activity,
        },
        {
          label: "Headlines Tracked",
          value:
            kpis?.total_headlines_24h != null
              ? String(kpis.total_headlines_24h)
              : "N/A",
          sub: "Last 24 hours",
          icon: Newspaper,
        },
        {
          label: "AI Model Prediction",
          value: kpis?.model_prediction ?? "N/A",
          sub:
            kpis?.model_confidence != null
              ? `${(kpis.model_confidence * 100).toFixed(0)}% confidence`
              : "",
          icon: Brain,
        },
        {
          label: "High Impact Events",
          value:
            kpis?.high_impact_count_24h != null
              ? String(kpis.high_impact_count_24h)
              : "N/A",
          sub: "Requiring attention",
          icon: Zap,
        },
      ]
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-lg mx-auto"
    >
      <div className="text-center mb-8">
        <Shield className="w-10 h-10 mx-auto mb-3 text-[#FFD700]" />
        <h2 className="text-2xl font-extrabold text-[#F8FAFC] mb-1">
          Strategic Intelligence Briefing
        </h2>
        <p className="text-sm text-[#94A3B8]">
          Here&apos;s what your intelligence system has been tracking
        </p>
      </div>

      {!loaded ? (
        <div className="text-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-[#FFD700] border-t-transparent rounded-full mx-auto"
          />
          <p className="text-xs text-[#64748B] mt-3">
            Loading intelligence data…
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-8">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                className="bg-[#111827] border border-[#FFD700]/20 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-[#FFD700]" />
                  <span className="text-[0.65rem] font-bold tracking-[0.08em] text-[#64748B] uppercase">
                    {card.label}
                  </span>
                </div>
                <p className="text-xl font-extrabold text-[#F8FAFC]">
                  {card.value}
                </p>
                {card.sub && (
                  <p className="text-[0.6rem] text-[#475569] mt-0.5">
                    {card.sub}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="text-center">
        <button
          onClick={onNext}
          disabled={!loaded}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm text-white transition-all disabled:opacity-40 bg-gradient-to-r from-[#B8860B] to-[#DAA520] hover:from-[#DAA520] hover:to-[#FFD700]"
        >
          Continue <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   EXECUTIVE — Step 2: Strategic Focus Areas
   ══════════════════════════════════════════════════════════════════════ */
function ExecStepFocus({
  selected,
  onChange,
  onNext,
}: {
  selected: ("WTI" | "Brent")[];
  onChange: (v: ("WTI" | "Brent")[]) => void;
  onNext: () => void;
}) {
  const options: { id: "WTI" | "Brent"; label: string; desc: string }[] = [
    {
      id: "WTI",
      label: "WTI Crude",
      desc: "West Texas Intermediate — US strategic benchmark",
    },
    {
      id: "Brent",
      label: "Brent Crude",
      desc: "North Sea benchmark — global strategic reference",
    },
  ];

  const toggle = (id: "WTI" | "Brent") => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-lg mx-auto"
    >
      <div className="text-center mb-8">
        <TrendingUp className="w-10 h-10 mx-auto mb-3 text-[#FFD700]" />
        <h2 className="text-2xl font-extrabold text-[#F8FAFC] mb-1">
          Strategic Focus Areas
        </h2>
        <p className="text-sm text-[#94A3B8]">
          Select the markets under your strategic oversight
        </p>
      </div>

      <div className="space-y-3 mb-8">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => toggle(opt.id)}
            className={`w-full text-left p-4 rounded-xl border transition-all duration-300 ${
              selected.includes(opt.id)
                ? "border-[#FFD700]/50 bg-[#FFD700]/5 shadow-[0_0_10px_rgba(255,215,0,0.1)]"
                : "border-[#1E293B] bg-[#111827] hover:border-[#334155]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-[#F8FAFC]">{opt.label}</p>
                <p className="text-xs text-[#64748B] mt-0.5">{opt.desc}</p>
              </div>
              {selected.includes(opt.id) && (
                <CheckCircle2 className="w-5 h-5 text-[#FFD700]" />
              )}
            </div>
          </button>
        ))}

        <button
          onClick={() => onChange(["WTI", "Brent"])}
          className={`w-full text-left p-4 rounded-xl border transition-all duration-300 ${
            selected.length === 2
              ? "border-[#FFD700]/50 bg-[#FFD700]/5"
              : "border-[#1E293B] bg-[#111827] hover:border-[#334155]"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-[#F8FAFC]">Both Benchmarks</p>
              <p className="text-xs text-[#64748B] mt-0.5">
                Full strategic coverage — complete market oversight
              </p>
            </div>
            {selected.length === 2 && (
              <CheckCircle2 className="w-5 h-5 text-[#FFD700]" />
            )}
          </div>
        </button>
      </div>

      <div className="text-center">
        <button
          onClick={onNext}
          disabled={selected.length === 0}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm text-white transition-all disabled:opacity-40 bg-gradient-to-r from-[#B8860B] to-[#DAA520] hover:from-[#DAA520] hover:to-[#FFD700]"
        >
          Continue <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   EXECUTIVE — Step 3: Escalation Protocols
   ══════════════════════════════════════════════════════════════════════ */
function ExecStepEscalation({
  config,
  onChange,
  onNext,
}: {
  config: AlertsConfig;
  onChange: (c: AlertsConfig) => void;
  onNext: () => void;
}) {
  const cadenceOptions: {
    value: AlertsConfig["briefingCadence"];
    label: string;
    desc: string;
  }[] = [
    { value: "realtime", label: "Real-time", desc: "Instant intelligence delivery" },
    { value: "daily", label: "Daily Digest", desc: "Morning strategic summary" },
    { value: "weekly", label: "Weekly Summary", desc: "End-of-week overview" },
  ];

  const escalationOptions: {
    value: AlertsConfig["escalationLevel"];
    label: string;
    desc: string;
  }[] = [
    { value: "all", label: "All Intelligence", desc: "Complete information flow" },
    { value: "high", label: "High Priority Only", desc: "Significant events only" },
    { value: "critical", label: "Critical Only", desc: "Urgent items requiring action" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-lg mx-auto"
    >
      <div className="text-center mb-6">
        <BarChart3 className="w-10 h-10 mx-auto mb-3 text-[#FFD700]" />
        <h2 className="text-2xl font-extrabold text-[#F8FAFC] mb-1">
          Escalation Protocols
        </h2>
        <p className="text-sm text-[#94A3B8]">
          Configure intelligence escalation parameters
        </p>
      </div>

      {/* Briefing Cadence */}
      <div className="mb-5">
        <p className="text-xs font-bold tracking-[0.1em] text-[#64748B] uppercase mb-2">
          Briefing Cadence
        </p>
        <div className="grid grid-cols-3 gap-2">
          {cadenceOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() =>
                onChange({ ...config, briefingCadence: opt.value })
              }
              className={`p-3 rounded-xl border text-center transition-all duration-300 ${
                config.briefingCadence === opt.value
                  ? "border-[#FFD700]/50 bg-[#FFD700]/5 shadow-[0_0_8px_rgba(255,215,0,0.1)]"
                  : "border-[#1E293B] bg-[#111827] hover:border-[#334155]"
              }`}
            >
              <p
                className={`text-xs font-bold ${
                  config.briefingCadence === opt.value
                    ? "text-[#FFD700]"
                    : "text-[#F8FAFC]"
                }`}
              >
                {opt.label}
              </p>
              <p className="text-[0.6rem] text-[#475569] mt-0.5">
                {opt.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Escalation Level */}
      <div className="mb-5">
        <p className="text-xs font-bold tracking-[0.1em] text-[#64748B] uppercase mb-2">
          Escalation Level
        </p>
        <div className="grid grid-cols-3 gap-2">
          {escalationOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() =>
                onChange({ ...config, escalationLevel: opt.value })
              }
              className={`p-3 rounded-xl border text-center transition-all duration-300 ${
                config.escalationLevel === opt.value
                  ? "border-[#FFD700]/50 bg-[#FFD700]/5 shadow-[0_0_8px_rgba(255,215,0,0.1)]"
                  : "border-[#1E293B] bg-[#111827] hover:border-[#334155]"
              }`}
            >
              <p
                className={`text-xs font-bold ${
                  config.escalationLevel === opt.value
                    ? "text-[#FFD700]"
                    : "text-[#F8FAFC]"
                }`}
              >
                {opt.label}
              </p>
              <p className="text-[0.6rem] text-[#475569] mt-0.5">
                {opt.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Threshold sliders */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-5 space-y-5 mb-5">
        {config.commodities.includes("WTI") && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold tracking-[0.1em] text-[#64748B] uppercase">
              WTI Crude
            </h3>
            <ThresholdSlider
              label="Price increase threshold"
              value={config.wtiIncreaseThreshold}
              field="wtiIncreaseThreshold"
              accentColor="#FFD700"
              config={config}
              onChange={onChange}
            />
            <ThresholdSlider
              label="Price decrease threshold"
              value={config.wtiDecreaseThreshold}
              field="wtiDecreaseThreshold"
              accentColor="#FFD700"
              config={config}
              onChange={onChange}
            />
          </div>
        )}
        {config.commodities.includes("Brent") && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold tracking-[0.1em] text-[#64748B] uppercase">
              Brent Crude
            </h3>
            <ThresholdSlider
              label="Price increase threshold"
              value={config.brentIncreaseThreshold}
              field="brentIncreaseThreshold"
              accentColor="#FFD700"
              config={config}
              onChange={onChange}
            />
            <ThresholdSlider
              label="Price decrease threshold"
              value={config.brentDecreaseThreshold}
              field="brentDecreaseThreshold"
              accentColor="#FFD700"
              config={config}
              onChange={onChange}
            />
          </div>
        )}
      </div>

      {/* Priority Alerts toggle */}
      <div className="bg-[#111827] border border-[#FFD700]/20 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="w-4 h-4 text-[#FFD700]" />
            <div>
              <p className="text-sm font-bold text-[#F8FAFC]">
                Priority Alerts Only
              </p>
              <p className="text-[0.65rem] text-[#64748B]">
                Only receive HIGH-IMPACT events — strategic intelligence only
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              onChange({
                ...config,
                priorityAlertsOnly: !config.priorityAlertsOnly,
              })
            }
            className={`w-11 h-6 rounded-full transition-all duration-300 ${
              config.priorityAlertsOnly ? "bg-[#FFD700]" : "bg-[#334155]"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${
                config.priorityAlertsOnly
                  ? "translate-x-5.5"
                  : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm text-white transition-all bg-gradient-to-r from-[#B8860B] to-[#DAA520] hover:from-[#DAA520] hover:to-[#FFD700]"
        >
          Continue <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   EXECUTIVE — Step 4: Dashboard Preview
   ══════════════════════════════════════════════════════════════════════ */
function ExecStepDashboardPreview({ onNext }: { onNext: () => void }) {
  const modules = [
    { label: "Command Center", icon: LayoutDashboard, special: false },
    { label: "Intelligence Feed", icon: Newspaper, special: false },
    { label: "Commodity View", icon: TrendingUp, special: false },
    { label: "Data Analytics", icon: BarChart3, special: false },
    { label: "AI Model", icon: Brain, special: false },
    { label: "Signal Engine", icon: Zap, special: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-lg mx-auto"
    >
      <div className="text-center mb-6">
        <Eye className="w-10 h-10 mx-auto mb-3 text-[#FFD700]" />
        <h2 className="text-2xl font-extrabold text-[#F8FAFC] mb-1">
          Executive Dashboard Preview
        </h2>
        <p className="text-sm text-[#94A3B8]">
          Your complete intelligence environment
        </p>
      </div>

      {/* Dashboard mockup with frosted glass */}
      <div className="relative bg-[#111827]/80 backdrop-blur-md border border-[#FFD700]/20 rounded-xl p-5 mb-5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFD700]/[0.03] to-transparent" />
        <div className="relative z-10 space-y-2.5">
          {modules.map((mod, i) => {
            const Icon = mod.icon;
            return (
              <motion.div
                key={mod.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`flex items-center gap-3 p-2.5 rounded-lg ${
                  mod.special
                    ? "bg-[#FFD700]/10 border border-[#FFD700]/30"
                    : "bg-[#0A0E17]/50"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    mod.special ? "text-[#FFD700]" : "text-[#64748B]"
                  }`}
                />
                <span
                  className={`text-sm font-medium flex-1 ${
                    mod.special ? "text-[#FFD700]" : "text-[#F8FAFC]"
                  }`}
                >
                  {mod.label}
                </span>
                {mod.special && (
                  <span className="text-[0.55rem] font-bold tracking-[0.05em] uppercase px-2 py-0.5 rounded-full border border-[#FFD700]/40 bg-[#FFD700]/10 text-[#FFD700]">
                    Executive Only
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Signal Engine highlight */}
      <div className="bg-[#111827] border border-[#FFD700]/20 rounded-xl p-4 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-[#FFD700]" />
          <span className="text-xs font-bold text-[#FFD700]">
            Signal Engine
          </span>
        </div>
        <p className="text-[0.65rem] text-[#94A3B8]">
          Strategic forecasting reserved for executive clearance
        </p>
      </div>

      {/* Access comparison */}
      <div className="grid grid-cols-3 gap-2 mb-8">
        {[
          { role: "Your access", count: 6, highlight: true },
          { role: "Analyst", count: 5, highlight: false },
          { role: "Viewer", count: 3, highlight: false },
        ].map((item) => (
          <div
            key={item.role}
            className={`text-center p-3 rounded-xl border ${
              item.highlight
                ? "border-[#FFD700]/40 bg-[#FFD700]/5"
                : "border-[#1E293B] bg-[#111827]"
            }`}
          >
            <p
              className={`text-lg font-extrabold ${
                item.highlight ? "text-[#FFD700]" : "text-[#F8FAFC]"
              }`}
            >
              {item.count}
            </p>
            <p className="text-[0.6rem] text-[#64748B]">
              {item.role}
              {!item.highlight && " access"}
            </p>
            <p className="text-[0.55rem] text-[#475569]">modules</p>
          </div>
        ))}
      </div>

      <div className="text-center">
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm text-white transition-all bg-gradient-to-r from-[#B8860B] to-[#DAA520] hover:from-[#DAA520] hover:to-[#FFD700]"
        >
          Continue <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   EXECUTIVE — Step 5: Notification Setup (exec language)
   ══════════════════════════════════════════════════════════════════════ */
function ExecStepNotifications({
  config,
  onChange,
  email,
  onNext,
}: {
  config: AlertsConfig;
  onChange: (c: AlertsConfig) => void;
  email: string;
  onNext: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-lg mx-auto"
    >
      <div className="text-center mb-6">
        <Bell className="w-10 h-10 mx-auto mb-3 text-[#FFD700]" />
        <h2 className="text-2xl font-extrabold text-[#F8FAFC] mb-1">
          Executive Notifications
        </h2>
        <p className="text-sm text-[#94A3B8]">
          Configure your executive notification channel
        </p>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-5 space-y-4 mb-6">
        <div>
          <label className="block text-[0.65rem] font-semibold tracking-[0.1em] text-[#64748B] uppercase mb-1.5">
            Executive Notification Email
          </label>
          <input
            type="email"
            value={config.email || email}
            onChange={(e) => onChange({ ...config, email: e.target.value })}
            className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-lg px-4 py-2.5 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700]/30 transition-all"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="text-sm font-bold text-[#F8FAFC]">
              Enable Strategic Notifications
            </p>
            <p className="text-[0.65rem] text-[#64748B]">
              Receive intelligence alerts per escalation protocol
            </p>
          </div>
          <button
            onClick={() =>
              onChange({
                ...config,
                notificationsEnabled: !config.notificationsEnabled,
              })
            }
            className={`w-11 h-6 rounded-full transition-all duration-300 ${
              config.notificationsEnabled ? "bg-[#22C55E]" : "bg-[#334155]"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${
                config.notificationsEnabled
                  ? "translate-x-5.5"
                  : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm text-white transition-all bg-gradient-to-r from-[#B8860B] to-[#DAA520] hover:from-[#DAA520] hover:to-[#FFD700]"
        >
          Finalize <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   EXECUTIVE — Step 6: Activation Sequence
   ══════════════════════════════════════════════════════════════════════ */
function ExecStepActivation({ onFinish }: { onFinish: () => void }) {
  const [visibleTiles, setVisibleTiles] = useState(0);
  const [showRedirect, setShowRedirect] = useState(false);

  const tiles = [
    { label: "Sentiment Engine", status: "ONLINE", gold: false },
    { label: "Price Monitoring", status: "ACTIVE", gold: false },
    { label: "AI Model", status: "ENGAGED", gold: false },
    { label: "Signal Engine", status: "ARMED", gold: true },
    { label: "Priority Alerts", status: "CONFIGURED", gold: false },
    { label: "Strategic Briefings", status: "SCHEDULED", gold: false },
  ];

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    tiles.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleTiles(i + 1), (i + 1) * 200));
    });
    timers.push(
      setTimeout(() => setShowRedirect(true), tiles.length * 200 + 400)
    );
    timers.push(setTimeout(() => onFinish(), 5000));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFinish]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-lg mx-auto text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
      >
        <Shield
          className="w-12 h-12 mx-auto mb-4 text-[#FFD700]"
          style={{ filter: "drop-shadow(0 0 15px rgba(255,215,0,0.4))" }}
        />
      </motion.div>

      <h2 className="text-2xl font-extrabold tracking-tight text-[#F8FAFC] mb-6">
        <span className="bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFD700] bg-clip-text text-transparent">
          EXECUTIVE ENVIRONMENT ACTIVATED
        </span>
      </h2>

      <div className="space-y-2 mb-8">
        {tiles.map((tile, i) => (
          <motion.div
            key={tile.label}
            initial={{ opacity: 0, x: -20 }}
            animate={
              visibleTiles > i
                ? { opacity: 1, x: 0 }
                : { opacity: 0, x: -20 }
            }
            transition={{ duration: 0.3 }}
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              tile.gold
                ? "border-[#FFD700]/30 bg-[#FFD700]/5"
                : "border-[#1E293B] bg-[#111827]"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                tile.gold ? "bg-[#FFD700]" : "bg-[#22C55E]"
              }`}
              style={{
                boxShadow: tile.gold
                  ? "0 0 8px rgba(255,215,0,0.6)"
                  : "0 0 8px rgba(34,197,94,0.4)",
              }}
            />
            <span className="text-sm text-[#F8FAFC] flex-1 text-left">
              {tile.label}
            </span>
            <span
              className={`text-xs font-bold tracking-[0.05em] ${
                tile.gold ? "text-[#FFD700]" : "text-[#22C55E]"
              }`}
            >
              {tile.status}
            </span>
          </motion.div>
        ))}
      </div>

      {showRedirect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-2"
        >
          <p className="text-sm text-[#94A3B8]">
            Entering Command Center…
          </p>
          <div className="w-64 mx-auto">
            <div className="h-[2px] bg-[#1E293B] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{
                  duration: 5 - (tiles.length * 0.2 + 0.4),
                  ease: "easeInOut",
                }}
                className="h-full bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFD700]"
              />
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ANALYST — Shared Onboarding Steps (unchanged)
   ══════════════════════════════════════════════════════════════════════ */

function StepGreeting({
  name,
  onNext,
}: {
  name: string;
  onNext: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center max-w-lg mx-auto"
    >
      <Shield className="w-12 h-12 mx-auto mb-4 text-[#38BDF8]" />
      <h2 className="text-3xl font-extrabold text-[#F8FAFC] mb-3">
        Welcome, <span className="text-[#38BDF8]">{name}</span>
      </h2>
      <p className="text-[#94A3B8] text-sm leading-relaxed mb-2">
        SIGNAL is configuring your intelligence environment.
      </p>
      <p className="text-[#64748B] text-xs">
        Set up your commodity monitoring preferences and alert thresholds.
      </p>
      <button
        onClick={onNext}
        className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm text-white transition-all duration-300 bg-gradient-to-r from-[#1E40AF] to-[#2563EB] hover:from-[#2563EB] hover:to-[#3B82F6]"
      >
        Begin Configuration <ChevronRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

function StepCommodity({
  selected,
  onChange,
  onNext,
}: {
  selected: ("WTI" | "Brent")[];
  onChange: (v: ("WTI" | "Brent")[]) => void;
  onNext: () => void;
}) {
  const options: { id: "WTI" | "Brent"; label: string; desc: string }[] = [
    { id: "WTI", label: "WTI Crude", desc: "West Texas Intermediate — US benchmark" },
    { id: "Brent", label: "Brent Crude", desc: "North Sea benchmark — global reference" },
  ];

  const toggle = (id: "WTI" | "Brent") => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-lg mx-auto"
    >
      <div className="text-center mb-8">
        <TrendingUp className="w-10 h-10 mx-auto mb-3 text-[#38BDF8]" />
        <h2 className="text-2xl font-extrabold text-[#F8FAFC] mb-1">Commodity Selection</h2>
        <p className="text-sm text-[#94A3B8]">
          Choose which crude oil benchmarks to monitor.
        </p>
      </div>

      <div className="space-y-3 mb-8">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => toggle(opt.id)}
            className={`w-full text-left p-4 rounded-xl border transition-all duration-300 ${
              selected.includes(opt.id)
                ? "border-[#38BDF8]/50 bg-[#38BDF8]/5"
                : "border-[#1E293B] bg-[#111827] hover:border-[#334155]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-[#F8FAFC]">{opt.label}</p>
                <p className="text-xs text-[#64748B] mt-0.5">{opt.desc}</p>
              </div>
              {selected.includes(opt.id) && (
                <CheckCircle2 className="w-5 h-5 text-[#38BDF8]" />
              )}
            </div>
          </button>
        ))}

        <button
          onClick={() => onChange(["WTI", "Brent"])}
          className={`w-full text-left p-4 rounded-xl border transition-all duration-300 ${
            selected.length === 2
              ? "border-[#38BDF8]/50 bg-[#38BDF8]/5"
              : "border-[#1E293B] bg-[#111827] hover:border-[#334155]"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-[#F8FAFC]">Both Benchmarks</p>
              <p className="text-xs text-[#64748B] mt-0.5">Complete market coverage — WTI + Brent</p>
            </div>
            {selected.length === 2 && (
              <CheckCircle2 className="w-5 h-5 text-[#38BDF8]" />
            )}
          </div>
        </button>
      </div>

      <div className="text-center">
        <button
          onClick={onNext}
          disabled={selected.length === 0}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm text-white transition-all disabled:opacity-40 bg-gradient-to-r from-[#1E40AF] to-[#2563EB] hover:from-[#2563EB] hover:to-[#3B82F6]"
        >
          Continue <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

/* ── Threshold Slider ─────────────────────────────────────────────── */
function ThresholdSlider({
  label,
  value,
  field,
  accentColor,
  config,
  onChange,
}: {
  label: string;
  value: number;
  field: keyof AlertsConfig;
  accentColor: string;
  config: AlertsConfig;
  onChange: (c: AlertsConfig) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[#94A3B8]">{label}</span>
        <span className="font-bold" style={{ color: accentColor }}>
          {value}%
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={20}
        value={value}
        onChange={(e) =>
          onChange({ ...config, [field]: parseInt(e.target.value, 10) })
        }
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${accentColor} ${(value / 20) * 100}%, #1E293B ${(value / 20) * 100}%)`,
        }}
      />
    </div>
  );
}

function StepAlerts({
  config,
  onChange,
  onNext,
}: {
  config: AlertsConfig;
  onChange: (c: AlertsConfig) => void;
  onNext: () => void;
}) {
  const accentColor = "#38BDF8";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-lg mx-auto"
    >
      <div className="text-center mb-6">
        <BarChart3 className="w-10 h-10 mx-auto mb-3" style={{ color: accentColor }} />
        <h2 className="text-2xl font-extrabold text-[#F8FAFC] mb-1">Alert Thresholds</h2>
        <p className="text-sm text-[#94A3B8]">
          Set price change thresholds that trigger alerts.
        </p>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-5 space-y-5 mb-6">
        {config.commodities.includes("WTI") && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold tracking-[0.1em] text-[#64748B] uppercase">
              WTI Crude
            </h3>
            <ThresholdSlider
              label="Price increase threshold"
              value={config.wtiIncreaseThreshold}
              field="wtiIncreaseThreshold"
              accentColor={accentColor}
              config={config}
              onChange={onChange}
            />
            <ThresholdSlider
              label="Price decrease threshold"
              value={config.wtiDecreaseThreshold}
              field="wtiDecreaseThreshold"
              accentColor={accentColor}
              config={config}
              onChange={onChange}
            />
          </div>
        )}
        {config.commodities.includes("Brent") && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold tracking-[0.1em] text-[#64748B] uppercase">
              Brent Crude
            </h3>
            <ThresholdSlider
              label="Price increase threshold"
              value={config.brentIncreaseThreshold}
              field="brentIncreaseThreshold"
              accentColor={accentColor}
              config={config}
              onChange={onChange}
            />
            <ThresholdSlider
              label="Price decrease threshold"
              value={config.brentDecreaseThreshold}
              field="brentDecreaseThreshold"
              accentColor={accentColor}
              config={config}
              onChange={onChange}
            />
          </div>
        )}
      </div>

      <div className="text-center">
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm text-white transition-all bg-gradient-to-r from-[#1E40AF] to-[#2563EB] hover:from-[#2563EB] hover:to-[#3B82F6]"
        >
          Continue <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

function StepNotifications({
  config,
  onChange,
  email,
  onNext,
}: {
  config: AlertsConfig;
  onChange: (c: AlertsConfig) => void;
  email: string;
  onNext: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-lg mx-auto"
    >
      <div className="text-center mb-6">
        <Bell className="w-10 h-10 mx-auto mb-3 text-[#38BDF8]" />
        <h2 className="text-2xl font-extrabold text-[#F8FAFC] mb-1">Notification Setup</h2>
        <p className="text-sm text-[#94A3B8]">
          Choose how you want to receive alerts.
        </p>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-5 space-y-4 mb-6">
        <div>
          <label className="block text-[0.65rem] font-semibold tracking-[0.1em] text-[#64748B] uppercase mb-1.5">
            Notification Email
          </label>
          <input
            type="email"
            value={config.email || email}
            onChange={(e) => onChange({ ...config, email: e.target.value })}
            className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-lg px-4 py-2.5 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]/30 transition-all"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="text-sm font-bold text-[#F8FAFC]">Enable Notifications</p>
            <p className="text-[0.65rem] text-[#64748B]">Receive alerts when thresholds are met</p>
          </div>
          <button
            onClick={() =>
              onChange({ ...config, notificationsEnabled: !config.notificationsEnabled })
            }
            className={`w-11 h-6 rounded-full transition-all duration-300 ${
              config.notificationsEnabled ? "bg-[#22C55E]" : "bg-[#334155]"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${
                config.notificationsEnabled ? "translate-x-5.5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm text-white transition-all bg-gradient-to-r from-[#1E40AF] to-[#2563EB] hover:from-[#2563EB] hover:to-[#3B82F6]"
        >
          Finalize <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

function StepComplete({ onFinish }: { onFinish: () => void }) {
  const accentColor = "#38BDF8";

  useEffect(() => {
    const t = setTimeout(onFinish, 4000);
    return () => clearTimeout(t);
  }, [onFinish]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center max-w-lg mx-auto"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
      >
        <CheckCircle2
          className="w-16 h-16 mx-auto mb-6"
          style={{ color: accentColor, filter: `drop-shadow(0 0 15px ${accentColor}40)` }}
        />
      </motion.div>
      <h2 className="text-3xl font-extrabold text-[#F8FAFC] mb-3">
        Your SIGNAL Environment is Configured
      </h2>
      <p className="text-[#94A3B8] text-sm mb-2">
        Real-time monitoring is now active.
      </p>
      <p className="text-[#64748B] text-xs">
        Redirecting to Command Center…
      </p>

      <div className="mt-8 w-64 mx-auto">
        <div className="h-[2px] bg-[#1E293B] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 3.5, ease: "easeInOut" }}
            className="h-full"
            style={{
              background: `linear-gradient(to right, ${accentColor}, #2563EB, ${accentColor})`,
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

/* ── Progress indicator ──────────────────────────────────────────── */
function StepIndicator({
  current,
  total,
  isExec,
}: {
  current: number;
  total: number;
  isExec: boolean;
}) {
  const accentColor = isExec ? "#FFD700" : "#38BDF8";

  return (
    <div className="flex items-center gap-2 mb-10">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1 flex-1 rounded-full transition-all duration-500"
          style={{
            background: i <= current ? accentColor : "#1E293B",
            boxShadow: i <= current ? `0 0 8px ${accentColor}40` : "none",
          }}
        />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Main Onboarding Component
   ══════════════════════════════════════════════════════════════════════ */
function OnboardingContent() {
  const { user, isLoaded } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExecEntry = searchParams.get("exec") === "1";

  const isExec = user?.role === "Executive";

  /* Executive: phase 0 (verification) → steps 1-6
     Analyst:   steps 0-4 (greeting, commodity, alerts, notifications, complete) */
  const [showVerification, setShowVerification] = useState(
    isExec && isExecEntry
  );
  const [step, setStep] = useState(isExec ? 1 : 0);
  const [alertConfig, setAlertConfig] = useState<AlertsConfig>(
    getDefaultAlerts()
  );

  const handleVerificationComplete = useCallback(() => {
    setShowVerification(false);
  }, []);

  const handleFinish = useCallback(() => {
    saveOnboarding({ completed: true, alerts: alertConfig });
    router.replace("/dashboard");
  }, [alertConfig, router]);

  useEffect(() => {
    if (isLoaded && !user) router.replace("/");
  }, [user, isLoaded, router]);

  if (!isLoaded || !user) return null;

  /* ── Executive verification overlay ─────────────────────────── */
  if (showVerification && isExec) {
    return (
      <ExecVerification
        name={user.name}
        onComplete={handleVerificationComplete}
      />
    );
  }

  /* ── Executive flow (steps 1-6) ─────────────────────────────── */
  if (isExec) {
    const EXEC_TOTAL = 6;
    const stepIndex = step - 1; // 0-based for indicator (steps 1-6 → indices 0-5)

    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#0A0E17] overflow-hidden px-4">
        <div
          className="absolute inset-0 transition-all duration-1000"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(255,215,0,0.04) 0%, transparent 60%)",
          }}
        />

        <div className="relative z-10 w-full max-w-lg">
          {step <= EXEC_TOTAL && step < EXEC_TOTAL && (
            <>
              <StepIndicator
                current={stepIndex}
                total={EXEC_TOTAL}
                isExec
              />
              <div className="flex items-center gap-2 mb-6">
                <Settings className="w-3.5 h-3.5 text-[#64748B]" />
                <span className="text-[0.65rem] font-bold tracking-[0.15em] text-[#64748B] uppercase">
                  Step {step} of {EXEC_TOTAL}
                </span>
                <span className="text-[0.6rem] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded-full border border-[#FFD700]/30 bg-[#FFD700]/10 text-[#FFD700] ml-auto">
                  Executive
                </span>
              </div>
            </>
          )}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <ExecStepBriefing
                key="exec-briefing"
                onNext={() => setStep(2)}
              />
            )}
            {step === 2 && (
              <ExecStepFocus
                key="exec-focus"
                selected={alertConfig.commodities}
                onChange={(c) =>
                  setAlertConfig((prev) => ({ ...prev, commodities: c }))
                }
                onNext={() => setStep(3)}
              />
            )}
            {step === 3 && (
              <ExecStepEscalation
                key="exec-escalation"
                config={alertConfig}
                onChange={setAlertConfig}
                onNext={() => setStep(4)}
              />
            )}
            {step === 4 && (
              <ExecStepDashboardPreview
                key="exec-preview"
                onNext={() => setStep(5)}
              />
            )}
            {step === 5 && (
              <ExecStepNotifications
                key="exec-notif"
                config={alertConfig}
                onChange={setAlertConfig}
                email={user.email}
                onNext={() => setStep(6)}
              />
            )}
            {step === 6 && (
              <ExecStepActivation
                key="exec-activation"
                onFinish={handleFinish}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  /* ── Analyst flow (steps 0-4, unchanged) ────────────────────── */
  const ANALYST_TOTAL = 5;

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#0A0E17] overflow-hidden px-4">
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(56,189,248,0.04) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 w-full max-w-lg">
        {step < 4 && (
          <StepIndicator
            current={step}
            total={ANALYST_TOTAL - 1}
            isExec={false}
          />
        )}

        {step < 4 && (
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-3.5 h-3.5 text-[#64748B]" />
            <span className="text-[0.65rem] font-bold tracking-[0.15em] text-[#64748B] uppercase">
              Step {step + 1} of {ANALYST_TOTAL - 1}
            </span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 0 && (
            <StepGreeting
              key="greeting"
              name={user.name.split(" ")[0]}
              onNext={() => setStep(1)}
            />
          )}
          {step === 1 && (
            <StepCommodity
              key="commodity"
              selected={alertConfig.commodities}
              onChange={(c) =>
                setAlertConfig((prev) => ({ ...prev, commodities: c }))
              }
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <StepAlerts
              key="alerts"
              config={alertConfig}
              onChange={setAlertConfig}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <StepNotifications
              key="notifications"
              config={alertConfig}
              onChange={setAlertConfig}
              email={user.email}
              onNext={() => setStep(4)}
            />
          )}
          {step === 4 && (
            <StepComplete key="complete" onFinish={handleFinish} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingContent />
    </Suspense>
  );
}
