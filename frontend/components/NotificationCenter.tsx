/* ── SIGNAL — Notification Center ─────────────────────────────────────
   Expandable dropdown showing alert history when clicking the bell icon.
   Supports mark-as-read, clear-all, and categorized alert display.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAlerts } from "@/lib/alerts";
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
} from "lucide-react";

const SEVERITY_STYLES: Record<string, { icon: React.ReactNode; border: string; text: string }> = {
  critical: {
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    border: "border-[#EF4444]/30",
    text: "text-[#EF4444]",
  },
  warning: {
    icon: <TrendingDown className="w-3.5 h-3.5" />,
    border: "border-[#F59E0B]/30",
    text: "text-[#F59E0B]",
  },
  info: {
    icon: <Info className="w-3.5 h-3.5" />,
    border: "border-[#38BDF8]/30",
    text: "text-[#38BDF8]",
  },
  success: {
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    border: "border-[#22C55E]/30",
    text: "text-[#22C55E]",
  },
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const { alerts, markRead, clearAlerts } = useAlerts();
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = alerts.filter((a) => !a.read).length;

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  const markAllRead = () => {
    alerts.forEach((a) => {
      if (!a.read) markRead(a.id);
    });
  };

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative text-[#64748B] hover:text-[#F8FAFC] transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 ? (
          <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-[#DD1D21] rounded-full text-[0.5rem] text-white font-bold flex items-center justify-center px-0.5 animate-pulse-dot" aria-hidden="true">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#22C55E] rounded-full" aria-hidden="true" />
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-8 w-80 sm:w-96 bg-[#0D1321] border border-[#1E293B]/80 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] ring-1 ring-[#1E293B] z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#FBCE07]" />
                <span className="text-sm font-bold text-[#F8FAFC]">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[0.55rem] font-bold text-[#DD1D21] bg-[#DD1D21]/10 px-1.5 py-0.5 rounded-full border border-[#DD1D21]/30">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[0.6rem] text-[#64748B] hover:text-[#38BDF8] transition-colors flex items-center gap-1"
                    title="Mark all read"
                  >
                    <CheckCheck className="w-3 h-3" />
                  </button>
                )}
                {alerts.length > 0 && (
                  <button
                    onClick={clearAlerts}
                    className="text-[0.6rem] text-[#64748B] hover:text-[#EF4444] transition-colors flex items-center gap-1"
                    title="Clear all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="text-[#64748B] hover:text-[#F8FAFC] transition-colors ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Alert list */}
            <div className="max-h-[360px] overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Bell className="w-6 h-6 text-[#334155] mx-auto mb-2" />
                  <p className="text-sm text-[#64748B]">No notifications yet</p>
                  <p className="text-[0.6rem] text-[#475569] mt-1">
                    Alerts will appear here when thresholds are triggered.
                  </p>
                </div>
              ) : (
                <div className="py-1">
                  {alerts.slice(0, 20).map((alert) => {
                    const severity = alert.severity ?? "info";
                    const style = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.info;
                    return (
                      <button
                        key={alert.id}
                        onClick={() => markRead(alert.id)}
                        className={`w-full text-left px-4 py-3 border-l-2 ${style.border} transition-colors ${
                          alert.read
                            ? "opacity-60 hover:opacity-80"
                            : "bg-[#1A2234]/30 hover:bg-[#1E293B]/50"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className={`mt-0.5 shrink-0 ${style.text}`}>
                            {style.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium leading-relaxed ${
                              alert.read ? "text-[#94A3B8]" : "text-[#F8FAFC]"
                            }`}>
                              {alert.message}
                            </p>
                            <p className="text-[0.55rem] text-[#475569] mt-1">
                              {new Date(alert.timestamp).toLocaleString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "UTC",
                              })}
                              {!alert.read && (
                                <span className="ml-2 text-[#38BDF8]">● New</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {alerts.length > 0 && (
              <div className="px-4 py-2 border-t border-[#1E293B] text-center">
                <span className="text-[0.55rem] text-[#475569]">
                  Showing {Math.min(alerts.length, 20)} of {alerts.length} alerts
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
