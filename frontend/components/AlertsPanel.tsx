/* ── SIGNAL — Alerts Panel ────────────────────────────────────────────
   Real-time alerts derived from high-impact headlines and sentiment
   spikes.  Shows volatility warnings and geopolitical risks.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import type { Headline } from "@/lib/api";
import {
  AlertTriangle,
  TrendingDown,
  Globe,
  Flame,
  Zap,
} from "lucide-react";

interface Props {
  headlines: Headline[];
  loading: boolean;
}

interface Alert {
  icon: React.ReactNode;
  message: string;
  severity: "critical" | "warning" | "info";
  time: string;
}

function deriveAlerts(headlines: Headline[]): Alert[] {
  const alerts: Alert[] = [];

  // Find extreme sentiment or high-impact headlines
  for (const h of headlines.slice(0, 30)) {
    if (h.impact_score >= 80) {
      alerts.push({
        icon: <Flame className="w-4 h-4" />,
        message: `High-impact event: ${h.title.slice(0, 70)}…`,
        severity: "critical",
        time: new Date(h.published_at).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    } else if (h.sentiment_score < -0.5) {
      alerts.push({
        icon: <TrendingDown className="w-4 h-4" />,
        message: `Severe negative sentiment: ${h.source} — ${h.event_type}`,
        severity: "warning",
        time: new Date(h.published_at).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    } else if (
      h.event_type === "Geopolitics" &&
      h.impact_score >= 60
    ) {
      alerts.push({
        icon: <Globe className="w-4 h-4" />,
        message: `Geopolitical risk: ${h.title.slice(0, 70)}…`,
        severity: "warning",
        time: new Date(h.published_at).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    }
  }

  // Always add a general volatility info alert if we have any data
  if (headlines.length > 0) {
    const negCount = headlines.filter((h) => h.sentiment_score < -0.15).length;
    if (negCount > headlines.length * 0.4) {
      alerts.unshift({
        icon: <AlertTriangle className="w-4 h-4" />,
        message: `${negCount} bearish signals detected in recent coverage`,
        severity: "warning",
        time: "Now",
      });
    }
  }

  return alerts.slice(0, 6);
}

const severityStyle = {
  critical:
    "border-[#EF4444]/30 bg-[#EF4444]/5 text-[#EF4444]",
  warning:
    "border-[#F59E0B]/30 bg-[#F59E0B]/5 text-[#F59E0B]",
  info: "border-[#38BDF8]/30 bg-[#38BDF8]/5 text-[#38BDF8]",
};

export default function AlertsPanel({ headlines, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5 h-full animate-pulse">
        <div className="h-4 w-28 bg-[var(--shell-border-2)] rounded mb-4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 bg-[var(--shell-border)] rounded-lg mb-2" />
        ))}
      </div>
    );
  }

  const alerts = deriveAlerts(headlines);

  return (
    <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#F59E0B]" />
          <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase">
            Active Alerts
          </span>
        </div>
        {alerts.length > 0 && (
          <span className="text-[0.6rem] font-bold text-[#EF4444] bg-[#EF4444]/10 px-2 py-0.5 rounded-full border border-[#EF4444]/30">
            {alerts.length}
          </span>
        )}
      </div>

      {alerts.length === 0 && (
        <div className="text-center py-8">
          <Zap className="w-8 h-8 text-[var(--shell-border-2)] mx-auto mb-2" />
          <p className="text-sm text-[var(--shell-muted-2)]">No active alerts</p>
          <p className="text-xs text-[var(--shell-muted-3)] mt-1">
            Markets appear stable
          </p>
        </div>
      )}

      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {alerts.map((a, i) => (
          <div
            key={i}
            className={`border rounded-lg p-3 ${severityStyle[a.severity]}`}
          >
            <div className="flex items-start gap-2">
              <div className="shrink-0 mt-0.5">{a.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium leading-snug line-clamp-2">
                  {a.message}
                </p>
                <p className="text-[0.55rem] opacity-60 mt-1">{a.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
