/* ── SIGNAL — Alert Simulator ─────────────────────────────────────────
   Monitors simulated price changes and triggers alerts when user-
   configured thresholds are crossed.  Runs as a background effect
   inside the dashboard layout.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useAlerts } from "@/lib/alerts";
import { loadOnboarding } from "@/lib/onboarding";

/**
 * Simulates periodic price checks and fires alerts when
 * thresholds configured during onboarding are crossed.
 * All "email sending" is simulated via UI toast + console.log.
 */
export default function AlertSimulator() {
  const { user } = useAuth();
  const { addAlert, showToast, alertConfig } = useAlerts();
  const lastCheck = useRef<number>(0);

  useEffect(() => {
    /* Only run for Analyst and Executive */
    if (!user || user.role === "Viewer") return;

    const onboarding = loadOnboarding();
    if (!onboarding?.completed) return;

    const config = onboarding.alerts;
    if (!config.notificationsEnabled) return;

    lastCheck.current = Date.now();

    /* Simulate price monitoring every 30s */
    const interval = setInterval(() => {
      lastCheck.current = Date.now();

      /* Simulate random price changes */
      if (config.commodities.includes("WTI")) {
        const change = (Math.random() - 0.48) * 2.5; // slight upward bias
        const absChange = Math.abs(change);

        if (change > 0 && absChange >= config.wtiIncreaseThreshold * 0.3) {
          const pct = (config.wtiIncreaseThreshold * (0.8 + Math.random() * 0.4)).toFixed(1);
          addAlert({
            message: `WTI increased by ${pct}% — threshold crossed`,
            detail: config.priorityAlertsOnly ? "Priority alert" : "Alert sent to your email",
            severity: absChange > config.wtiIncreaseThreshold * 0.5 ? "critical" : "warning",
          });
          showToast({
            message: `WTI increased by ${pct}%`,
            detail: "Alert sent to your email",
            type: "warning",
          });
          console.log(`[SIGNAL Alert] WTI increased by ${pct}% — simulated email to ${config.email || user.email}`);
        } else if (change < 0 && absChange >= config.wtiDecreaseThreshold * 0.3) {
          const pct = (config.wtiDecreaseThreshold * (0.8 + Math.random() * 0.4)).toFixed(1);
          addAlert({
            message: `WTI decreased by ${pct}% — threshold crossed`,
            detail: config.priorityAlertsOnly ? "Priority alert" : "Alert sent to your email",
            severity: "critical",
          });
          showToast({
            message: `WTI decreased by ${pct}%`,
            detail: "Alert sent to your email",
            type: "warning",
          });
          console.log(`[SIGNAL Alert] WTI decreased by ${pct}% — simulated email to ${config.email || user.email}`);
        }
      }

      if (config.commodities.includes("Brent")) {
        const change = (Math.random() - 0.48) * 2.5;
        const absChange = Math.abs(change);

        if (change > 0 && absChange >= config.brentIncreaseThreshold * 0.3) {
          const pct = (config.brentIncreaseThreshold * (0.8 + Math.random() * 0.4)).toFixed(1);
          addAlert({
            message: `Brent increased by ${pct}% — threshold crossed`,
            detail: "Alert sent to your email",
            severity: "warning",
          });
          showToast({
            message: `Brent increased by ${pct}%`,
            detail: "Alert sent to your email",
            type: "info",
          });
          console.log(`[SIGNAL Alert] Brent increased by ${pct}% — simulated email to ${config.email || user.email}`);
        } else if (change < 0 && absChange >= config.brentDecreaseThreshold * 0.3) {
          const pct = (config.brentDecreaseThreshold * (0.8 + Math.random() * 0.4)).toFixed(1);
          addAlert({
            message: `Brent decreased by ${pct}% — threshold crossed`,
            detail: "Alert sent to your email",
            severity: "critical",
          });
          showToast({
            message: `Brent decreased by ${pct}%`,
            detail: "Alert sent to your email",
            type: "warning",
          });
          console.log(`[SIGNAL Alert] Brent decreased by ${pct}% — simulated email to ${config.email || user.email}`);
        }
      }
    }, 30_000); // Check every 30s

    return () => clearInterval(interval);
  }, [user, addAlert, showToast, alertConfig]);

  return null; // Invisible background component
}
