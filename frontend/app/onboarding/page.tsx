/* ── SIGNAL — Onboarding Flow ─────────────────────────────────────────
   Multi-step JARVIS-style onboarding for Analyst & Executive.
   Executive gets a full-screen "Executive Access Granted" experience
   before entering the onboarding steps + additional priority options.
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
} from "lucide-react";
import {
  saveOnboarding,
  getDefaultAlerts,
  type AlertsConfig,
} from "@/lib/onboarding";

/* ── Executive Access Experience ──────────────────────────────────── */
function ExecutiveExperience({
  name,
  onComplete,
}: {
  name: string;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState(0);

  /* Pre-compute particle positions on client to avoid impure render calls */
  const [particles, setParticles] = useState<
    Array<{ id: number; duration: number; delay: number; left: number }>
  >([]);

  useEffect(() => {
    setTimeout(() => setParticles(
      Array.from({ length: 20 }).map((_, i) => ({
        id: i,
        duration: 4 + Math.random() * 3,
        delay: Math.random() * 2,
        left: Math.random() * 100,
      }))
    ), 0);
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 800);
    const t2 = setTimeout(() => setPhase(2), 2200);
    const t3 = setTimeout(() => setPhase(3), 4000);
    const t4 = setTimeout(() => onComplete(), 5500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0A0E17] overflow-hidden">
      {/* Gold radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,215,0,0.08)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,215,0,0.04)_0%,transparent_40%)]" />

      {/* Gold particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: "100vh" }}
            animate={{ opacity: [0, 0.6, 0], y: "-10vh" }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
            }}
            className="absolute w-1 h-1 rounded-full bg-[#FFD700]"
            style={{ left: `${p.left}%` }}
          />
        ))}
      </div>

      {/* Crown icon */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <Crown className="w-16 h-16 text-[#FFD700] mb-6 drop-shadow-[0_0_20px_rgba(255,215,0,0.4)]" />
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="text-4xl sm:text-5xl font-extrabold tracking-tight text-center"
      >
        <span className="bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFD700] bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(255,215,0,0.3)]">
          Executive Access Granted
        </span>
      </motion.h1>

      {/* Welcome name */}
      {phase >= 1 && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mt-4 text-xl text-[#F8FAFC] font-medium"
        >
          Welcome, <span className="text-[#FFD700] font-bold">{name}</span>
        </motion.p>
      )}

      {/* System message */}
      {phase >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mt-6 text-center"
        >
          <p className="text-[#94A3B8] text-sm tracking-wide">
            SIGNAL Executive Intelligence Layer{" "}
            <span className="text-[#FFD700] font-semibold">Activated</span>
          </p>
          <p className="text-[#64748B] text-xs mt-1">
            Full strategic oversight • Priority intelligence • Gold-tier access
          </p>
        </motion.div>
      )}

      {/* Loading bar */}
      {phase >= 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-10 w-72"
        >
          <div className="h-[2px] bg-[#1E293B] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2.5, ease: "easeInOut" }}
              className="h-full bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFD700]"
            />
          </div>
          <p className="text-[0.6rem] text-[#475569] text-center mt-2 tracking-[0.15em] uppercase">
            Configuring Executive Environment…
          </p>
        </motion.div>
      )}

      {/* Fade out */}
      {phase >= 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="fixed inset-0 bg-[#0A0E17] z-50"
        />
      )}
    </div>
  );
}

/* ── Onboarding Steps ────────────────────────────────────────────── */

function StepGreeting({
  name,
  isExec,
  onNext,
}: {
  name: string;
  isExec: boolean;
  onNext: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center max-w-lg mx-auto"
    >
      <Shield className={`w-12 h-12 mx-auto mb-4 ${isExec ? "text-[#FFD700]" : "text-[#38BDF8]"}`} />
      <h2 className="text-3xl font-extrabold text-[#F8FAFC] mb-3">
        Welcome, <span className={isExec ? "text-[#FFD700]" : "text-[#38BDF8]"}>{name}</span>
      </h2>
      <p className="text-[#94A3B8] text-sm leading-relaxed mb-2">
        {isExec
          ? "SIGNAL is configuring your executive intelligence environment."
          : "SIGNAL is configuring your intelligence environment."}
      </p>
      <p className="text-[#64748B] text-xs">
        {isExec
          ? "You will have access to strategic-level briefings, priority alerts, and full platform oversight."
          : "Set up your commodity monitoring preferences and alert thresholds."}
      </p>
      <button
        onClick={onNext}
        className={`mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm text-white transition-all duration-300 ${
          isExec
            ? "bg-gradient-to-r from-[#B8860B] to-[#DAA520] hover:from-[#DAA520] hover:to-[#FFD700]"
            : "bg-gradient-to-r from-[#1E40AF] to-[#2563EB] hover:from-[#2563EB] hover:to-[#3B82F6]"
        }`}
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
  isExec,
}: {
  selected: ("WTI" | "Brent")[];
  onChange: (v: ("WTI" | "Brent")[]) => void;
  onNext: () => void;
  isExec: boolean;
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
        <TrendingUp className={`w-10 h-10 mx-auto mb-3 ${isExec ? "text-[#FFD700]" : "text-[#38BDF8]"}`} />
        <h2 className="text-2xl font-extrabold text-[#F8FAFC] mb-1">Commodity Selection</h2>
        <p className="text-sm text-[#94A3B8]">
          {isExec
            ? "Select the commodities for your strategic monitoring dashboard."
            : "Choose which crude oil benchmarks to monitor."}
        </p>
      </div>

      <div className="space-y-3 mb-8">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => toggle(opt.id)}
            className={`w-full text-left p-4 rounded-xl border transition-all duration-300 ${
              selected.includes(opt.id)
                ? isExec
                  ? "border-[#FFD700]/50 bg-[#FFD700]/5 shadow-[0_0_10px_rgba(255,215,0,0.1)]"
                  : "border-[#38BDF8]/50 bg-[#38BDF8]/5"
                : "border-[#1E293B] bg-[#111827] hover:border-[#334155]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-[#F8FAFC]">{opt.label}</p>
                <p className="text-xs text-[#64748B] mt-0.5">{opt.desc}</p>
              </div>
              {selected.includes(opt.id) && (
                <CheckCircle2 className={`w-5 h-5 ${isExec ? "text-[#FFD700]" : "text-[#38BDF8]"}`} />
              )}
            </div>
          </button>
        ))}

        <button
          onClick={() => onChange(["WTI", "Brent"])}
          className={`w-full text-left p-4 rounded-xl border transition-all duration-300 ${
            selected.length === 2
              ? isExec
                ? "border-[#FFD700]/50 bg-[#FFD700]/5"
                : "border-[#38BDF8]/50 bg-[#38BDF8]/5"
              : "border-[#1E293B] bg-[#111827] hover:border-[#334155]"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-[#F8FAFC]">Both Benchmarks</p>
              <p className="text-xs text-[#64748B] mt-0.5">Complete market coverage — WTI + Brent</p>
            </div>
            {selected.length === 2 && (
              <CheckCircle2 className={`w-5 h-5 ${isExec ? "text-[#FFD700]" : "text-[#38BDF8]"}`} />
            )}
          </div>
        </button>
      </div>

      <div className="text-center">
        <button
          onClick={onNext}
          disabled={selected.length === 0}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm text-white transition-all disabled:opacity-40 ${
            isExec
              ? "bg-gradient-to-r from-[#B8860B] to-[#DAA520] hover:from-[#DAA520] hover:to-[#FFD700]"
              : "bg-gradient-to-r from-[#1E40AF] to-[#2563EB] hover:from-[#2563EB] hover:to-[#3B82F6]"
          }`}
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
  isExec,
}: {
  config: AlertsConfig;
  onChange: (c: AlertsConfig) => void;
  onNext: () => void;
  isExec: boolean;
}) {
  const accentColor = isExec ? "#FFD700" : "#38BDF8";

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
          {isExec
            ? "Configure strategic alert parameters for your intelligence briefings."
            : "Set price change thresholds that trigger alerts."}
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

      {/* Executive-only: Priority Alerts */}
      {isExec && (
        <div className="bg-[#111827] border border-[#FFD700]/20 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="w-4 h-4 text-[#FFD700]" />
              <div>
                <p className="text-sm font-bold text-[#F8FAFC]">Priority Alerts Only</p>
                <p className="text-[0.65rem] text-[#64748B]">
                  Only receive HIGH-IMPACT events — strategic intelligence only
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                onChange({ ...config, priorityAlertsOnly: !config.priorityAlertsOnly })
              }
              className={`w-11 h-6 rounded-full transition-all duration-300 ${
                config.priorityAlertsOnly
                  ? "bg-[#FFD700]"
                  : "bg-[#334155]"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${
                  config.priorityAlertsOnly ? "translate-x-5.5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      )}

      <div className="text-center">
        <button
          onClick={onNext}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm text-white transition-all ${
            isExec
              ? "bg-gradient-to-r from-[#B8860B] to-[#DAA520] hover:from-[#DAA520] hover:to-[#FFD700]"
              : "bg-gradient-to-r from-[#1E40AF] to-[#2563EB] hover:from-[#2563EB] hover:to-[#3B82F6]"
          }`}
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
  isExec,
}: {
  config: AlertsConfig;
  onChange: (c: AlertsConfig) => void;
  email: string;
  onNext: () => void;
  isExec: boolean;
}) {
  const accentColor = isExec ? "#FFD700" : "#38BDF8";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-lg mx-auto"
    >
      <div className="text-center mb-6">
        <Bell className="w-10 h-10 mx-auto mb-3" style={{ color: accentColor }} />
        <h2 className="text-2xl font-extrabold text-[#F8FAFC] mb-1">Notification Setup</h2>
        <p className="text-sm text-[#94A3B8]">
          {isExec
            ? "Configure your executive notification preferences."
            : "Choose how you want to receive alerts."}
        </p>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-5 space-y-4 mb-6">
        {/* Email confirmation */}
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

        {/* Notification toggle */}
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
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm text-white transition-all ${
            isExec
              ? "bg-gradient-to-r from-[#B8860B] to-[#DAA520] hover:from-[#DAA520] hover:to-[#FFD700]"
              : "bg-gradient-to-r from-[#1E40AF] to-[#2563EB] hover:from-[#2563EB] hover:to-[#3B82F6]"
          }`}
        >
          Finalize <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

function StepComplete({
  isExec,
  onFinish,
}: {
  isExec: boolean;
  onFinish: () => void;
}) {
  const accentColor = isExec ? "#FFD700" : "#38BDF8";

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
        {isExec
          ? "Executive Environment Configured"
          : "Your SIGNAL Environment is Configured"}
      </h2>
      <p className="text-[#94A3B8] text-sm mb-2">
        {isExec
          ? "Strategic monitoring is now active. Priority intelligence pipeline engaged."
          : "Real-time monitoring is now active."}
      </p>
      <p className="text-[#64748B] text-xs">
        Redirecting to Command Center…
      </p>

      {/* Loading bar */}
      <div className="mt-8 w-64 mx-auto">
        <div className="h-[2px] bg-[#1E293B] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 3.5, ease: "easeInOut" }}
            className="h-full"
            style={{
              background: `linear-gradient(to right, ${accentColor}, ${isExec ? "#FFA500" : "#2563EB"}, ${accentColor})`,
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

/* ── Main Onboarding Component ───────────────────────────────────── */
function OnboardingContent() {
  const { user, isLoaded } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExecEntry = searchParams.get("exec") === "1";

  const [showExecExperience, setShowExecExperience] = useState(isExecEntry);
  const [step, setStep] = useState(0);
  const [alertConfig, setAlertConfig] = useState<AlertsConfig>(getDefaultAlerts());

  const isExec = user?.role === "Executive";

  const handleExecComplete = useCallback(() => {
    setShowExecExperience(false);
  }, []);

  const handleFinish = useCallback(() => {
    saveOnboarding({ completed: true, alerts: alertConfig });
    router.replace("/dashboard");
  }, [alertConfig, router]);

  /* Redirect if no user — but only after auth has loaded from localStorage
     to avoid a race condition where auth state hasn't propagated yet during
     client-side navigation from the register page. */
  useEffect(() => {
    if (isLoaded && !user) router.replace("/");
  }, [user, isLoaded, router]);

  if (!isLoaded || !user) return null;

  /* Executive experience overlay */
  if (showExecExperience) {
    return (
      <ExecutiveExperience
        name={user.name.split(" ")[0]}
        onComplete={handleExecComplete}
      />
    );
  }

  const totalSteps = 5;

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#0A0E17] overflow-hidden px-4">
      {/* Background glow */}
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: isExec
            ? "radial-gradient(ellipse at center, rgba(255,215,0,0.04) 0%, transparent 60%)"
            : "radial-gradient(ellipse at center, rgba(56,189,248,0.04) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 w-full max-w-lg">
        {/* Step indicator */}
        {step < 4 && (
          <StepIndicator current={step} total={totalSteps - 1} isExec={isExec} />
        )}

        {/* Step label */}
        {step < 4 && (
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-3.5 h-3.5 text-[#64748B]" />
            <span className="text-[0.65rem] font-bold tracking-[0.15em] text-[#64748B] uppercase">
              Step {step + 1} of {totalSteps - 1}
            </span>
            {isExec && (
              <span className="text-[0.6rem] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded-full border border-[#FFD700]/30 bg-[#FFD700]/10 text-[#FFD700] ml-auto">
                Executive
              </span>
            )}
          </div>
        )}

        {/* Steps */}
        <AnimatePresence mode="wait">
          {step === 0 && (
            <StepGreeting
              key="greeting"
              name={user.name.split(" ")[0]}
              isExec={isExec}
              onNext={() => setStep(1)}
            />
          )}
          {step === 1 && (
            <StepCommodity
              key="commodity"
              selected={alertConfig.commodities}
              onChange={(c) => setAlertConfig((prev) => ({ ...prev, commodities: c }))}
              onNext={() => setStep(2)}
              isExec={isExec}
            />
          )}
          {step === 2 && (
            <StepAlerts
              key="alerts"
              config={alertConfig}
              onChange={setAlertConfig}
              onNext={() => setStep(3)}
              isExec={isExec}
            />
          )}
          {step === 3 && (
            <StepNotifications
              key="notifications"
              config={alertConfig}
              onChange={setAlertConfig}
              email={user.email}
              onNext={() => setStep(4)}
              isExec={isExec}
            />
          )}
          {step === 4 && (
            <StepComplete
              key="complete"
              isExec={isExec}
              onFinish={handleFinish}
            />
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
