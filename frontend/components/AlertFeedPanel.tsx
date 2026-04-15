/* ── SIGNAL — Alert Feed Panel ────────────────────────────────────────
   Persistent list of alerts triggered by threshold crossings.
   Shows timestamped entries in a scrollable feed.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell, Trash2, Zap } from "lucide-react";
import { useAlerts } from "@/lib/alerts";

const SEVERITY_STYLE = {
  critical: "border-[#EF4444]/30 bg-[#EF4444]/5 text-[#EF4444]",
  warning: "border-[#F59E0B]/30 bg-[#F59E0B]/5 text-[#F59E0B]",
  info: "border-[#38BDF8]/30 bg-[#38BDF8]/5 text-[#38BDF8]",
};

export default function AlertFeedPanel() {
  const { alerts, clearAlerts } = useAlerts();

  return (
    <div className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#F59E0B]" />
          <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[#64748B] uppercase">
            Alert Feed
          </span>
          {alerts.length > 0 && (
            <span className="text-[0.6rem] font-bold text-[#EF4444] bg-[#EF4444]/10 px-2 py-0.5 rounded-full border border-[#EF4444]/30">
              {alerts.length}
            </span>
          )}
        </div>
        {alerts.length > 0 && (
          <button
            onClick={clearAlerts}
            className="text-[#64748B] hover:text-[#EF4444] transition-colors"
            title="Clear all alerts"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {alerts.length === 0 && (
        <div className="text-center py-6">
          <Zap className="w-8 h-8 text-[#334155] mx-auto mb-2" />
          <p className="text-sm text-[#64748B]">No threshold alerts</p>
          <p className="text-xs text-[#475569] mt-1">
            Alerts appear when price thresholds are crossed
          </p>
        </div>
      )}

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        <AnimatePresence>
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`border rounded-lg p-3 ${SEVERITY_STYLE[alert.severity]}`}
            >
              <p className="text-xs font-medium leading-snug">{alert.message}</p>
              {alert.detail && (
                <p className="text-[0.55rem] opacity-70 mt-0.5">{alert.detail}</p>
              )}
              <p className="text-[0.55rem] opacity-50 mt-1">
                {new Date(alert.timestamp).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
