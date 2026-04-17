/* ── SIGNAL — Settings & Profile Page ─────────────────────────────────
   User profile, alert configuration, session info, and app details.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { getAlertsConfig, saveAlertsConfig, type AlertsConfig } from "@/lib/onboarding";
import {
  User,
  Shield,
  Crown,
  Bell,
  Save,
  CheckCircle,
  Info,
  Monitor,
  Clock,
  Settings,
} from "lucide-react";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  Executive:
    "Full platform access including Signal Engine, executive briefings, and escalation protocols.",
  Analyst:
    "Data analysis, AI model insights, and commodity intelligence. Signal Engine restricted.",
  Viewer:
    "Read-only access to Command Center, Intelligence Feed, and Commodity View.",
};

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Executive: { bg: "bg-[#FFD700]/10", text: "text-[#FFD700]", border: "border-[#FFD700]/30" },
  Analyst: { bg: "bg-[#38BDF8]/10", text: "text-[#38BDF8]", border: "border-[#38BDF8]/30" },
  Viewer: { bg: "bg-[#94A3B8]/10", text: "text-[#94A3B8]", border: "border-[#94A3B8]/30" },
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [config, setConfig] = useState<AlertsConfig | null>(null);
  const [saved, setSaved] = useState(false);
  const [sessionStart] = useState(() => new Date().toISOString());

  useEffect(() => {
    const c = getAlertsConfig();
    if (c) setConfig(c);
  }, []);

  if (!user) return null;

  const roleStyle = ROLE_COLORS[user.role] ?? ROLE_COLORS.Viewer;

  const handleSave = () => {
    if (config) {
      saveAlertsConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-4xl"
    >
      {/* Header */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-[#FBCE07]" />
          <h1 className="text-xl font-extrabold text-[#F8FAFC]">
            Settings & Profile
          </h1>
        </div>
      </motion.div>

      {/* Profile Card */}
      <motion.div variants={fadeUp}>
        <div className="relative bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-2xl p-6 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#DD1D21] via-[#FBCE07] to-[#38BDF8]" />
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className={`w-16 h-16 rounded-2xl ${roleStyle.bg} ${roleStyle.border} border flex items-center justify-center shrink-0`}>
              {user.role === "Executive" ? (
                <Crown className={`w-7 h-7 ${roleStyle.text}`} />
              ) : (
                <User className={`w-7 h-7 ${roleStyle.text}`} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-extrabold text-[#F8FAFC]">
                {user.name}
              </h2>
              <p className="text-sm text-[#94A3B8] mt-0.5">{user.email}</p>

              <div className="flex items-center gap-3 mt-3">
                <span
                  className={`inline-flex items-center gap-1.5 text-[0.65rem] font-bold tracking-[0.08em] uppercase px-3 py-1 rounded-full border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
                >
                  {user.role === "Executive" ? (
                    <Crown className="w-3 h-3" />
                  ) : (
                    <Shield className="w-3 h-3" />
                  )}
                  {user.role}
                </span>
              </div>

              <p className="text-xs text-[#64748B] mt-3 leading-relaxed">
                {ROLE_DESCRIPTIONS[user.role]}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Alert Configuration */}
      <motion.div variants={fadeUp}>
        <div className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-[#FBCE07]" />
            <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[#64748B] uppercase">
              Alert Preferences
            </span>
          </div>

          {config ? (
            <div className="space-y-5">
              {/* WTI Price Thresholds */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#94A3B8] font-medium block mb-2">
                    WTI Increase Threshold (%)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      value={config.wtiIncreaseThreshold}
                      onChange={(e) =>
                        setConfig({ ...config, wtiIncreaseThreshold: parseInt(e.target.value) })
                      }
                      className="flex-1 accent-[#22C55E]"
                    />
                    <span className="text-sm font-mono text-[#22C55E] w-10 text-right">
                      {config.wtiIncreaseThreshold}%
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[#94A3B8] font-medium block mb-2">
                    WTI Decrease Threshold (%)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      value={config.wtiDecreaseThreshold}
                      onChange={(e) =>
                        setConfig({ ...config, wtiDecreaseThreshold: parseInt(e.target.value) })
                      }
                      className="flex-1 accent-[#EF4444]"
                    />
                    <span className="text-sm font-mono text-[#EF4444] w-10 text-right">
                      {config.wtiDecreaseThreshold}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Brent Price Thresholds */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#94A3B8] font-medium block mb-2">
                    Brent Increase Threshold (%)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      value={config.brentIncreaseThreshold}
                      onChange={(e) =>
                        setConfig({ ...config, brentIncreaseThreshold: parseInt(e.target.value) })
                      }
                      className="flex-1 accent-[#22C55E]"
                    />
                    <span className="text-sm font-mono text-[#22C55E] w-10 text-right">
                      {config.brentIncreaseThreshold}%
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[#94A3B8] font-medium block mb-2">
                    Brent Decrease Threshold (%)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      value={config.brentDecreaseThreshold}
                      onChange={(e) =>
                        setConfig({ ...config, brentDecreaseThreshold: parseInt(e.target.value) })
                      }
                      className="flex-1 accent-[#EF4444]"
                    />
                    <span className="text-sm font-mono text-[#EF4444] w-10 text-right">
                      {config.brentDecreaseThreshold}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Notification toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={config.notificationsEnabled}
                    onChange={(e) =>
                      setConfig({ ...config, notificationsEnabled: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#22C55E] rounded"
                  />
                  <div>
                    <span className="text-sm text-[#F8FAFC] group-hover:text-[#38BDF8] transition-colors">
                      Notifications
                    </span>
                    <p className="text-[0.6rem] text-[#475569]">
                      Enable toast and alert notifications
                    </p>
                  </div>
                </label>

                {user.role === "Executive" && (
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={config.priorityAlertsOnly}
                      onChange={(e) =>
                        setConfig({ ...config, priorityAlertsOnly: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#FFD700] rounded"
                    />
                    <div>
                      <span className="text-sm text-[#F8FAFC] group-hover:text-[#38BDF8] transition-colors">
                        Priority Only
                      </span>
                      <p className="text-[0.6rem] text-[#475569]">
                        Only show high-priority alerts
                      </p>
                    </div>
                  </label>
                )}
              </div>

              {/* Executive-only settings */}
              {user.role === "Executive" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#94A3B8] font-medium block mb-2">
                      Briefing Cadence
                    </label>
                    <select
                      value={config.briefingCadence}
                      onChange={(e) =>
                        setConfig({ ...config, briefingCadence: e.target.value as AlertsConfig["briefingCadence"] })
                      }
                      className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8] transition-colors"
                    >
                      <option value="realtime">Real-time</option>
                      <option value="daily">Daily Digest</option>
                      <option value="weekly">Weekly Summary</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#94A3B8] font-medium block mb-2">
                      Escalation Level
                    </label>
                    <select
                      value={config.escalationLevel}
                      onChange={(e) =>
                        setConfig({ ...config, escalationLevel: e.target.value as AlertsConfig["escalationLevel"] })
                      }
                      className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8] transition-colors"
                    >
                      <option value="all">All Events</option>
                      <option value="high">High Priority</option>
                      <option value="critical">Critical Only</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <button
                onClick={handleSave}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  saved
                    ? "bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30"
                    : "bg-[#FBCE07]/10 text-[#FBCE07] border border-[#FBCE07]/30 hover:bg-[#FBCE07]/20"
                }`}
              >
                {saved ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Preferences
                  </>
                )}
              </button>
            </div>
          ) : (
            <p className="text-sm text-[#64748B]">
              Complete onboarding to configure alert preferences.
            </p>
          )}
        </div>
      </motion.div>

      {/* Session Info */}
      <motion.div variants={fadeUp}>
        <div className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Monitor className="w-4 h-4 text-[#38BDF8]" />
            <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[#64748B] uppercase">
              Session Information
            </span>
          </div>
          <div className="space-y-3">
            {[
              { label: "Session Started", value: new Date(sessionStart).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" }) + " UTC" },
              { label: "Auth Method", value: "SIGNAL Local Auth (Demo)" },
              { label: "Access Level", value: user.role },
              { label: "Platform", value: typeof navigator !== "undefined" ? navigator.userAgent.split(" ").slice(-1)[0] : "—" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between text-sm border-b border-[#1E293B] pb-2"
              >
                <span className="text-[#94A3B8]">{item.label}</span>
                <span className="text-[#F8FAFC] font-medium text-right max-w-[60%] truncate">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* About */}
      <motion.div variants={fadeUp}>
        <div className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-[#A78BFA]" />
            <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[#64748B] uppercase">
              About SIGNAL
            </span>
          </div>
          <div className="space-y-3">
            {[
              { label: "Application", value: "S.I.G.N.A.L." },
              { label: "Full Name", value: "System for Intelligent Geopolitical News & Asset Linking" },
              { label: "Version", value: "2.0.0" },
              { label: "Frontend", value: "Next.js 16 · React 19 · Tailwind v4" },
              { label: "Backend", value: "FastAPI · SQLAlchemy · XGBoost" },
              { label: "AI Model", value: "RandomForest + Feature Engineering (33 features)" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between text-sm border-b border-[#1E293B] pb-2"
              >
                <span className="text-[#94A3B8]">{item.label}</span>
                <span className="text-[#F8FAFC] font-medium text-right max-w-[60%]">
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 text-[0.6rem] text-[#475569]">
            <Clock className="w-3 h-3" />
            Senior Design Project — Enterprise Oil Market Intelligence
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
