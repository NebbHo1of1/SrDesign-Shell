/* ── SIGNAL — Toast Notifications ─────────────────────────────────────
   Renders floating toast notifications in the bottom-right corner.
   Auto-dismisses after 5 seconds. Supports success, warning, info.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { useAlerts } from "@/lib/alerts";

const ICON_MAP = {
  success: <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />,
  warning: <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />,
  info: <Info className="w-4 h-4 text-[#38BDF8]" />,
};

const BG_MAP = {
  success: "border-[#22C55E]/30 bg-[#22C55E]/5",
  warning: "border-[#F59E0B]/30 bg-[#F59E0B]/5",
  info: "border-[#38BDF8]/30 bg-[#38BDF8]/5",
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useAlerts();

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className={`border rounded-xl p-3 backdrop-blur-lg shadow-lg ${BG_MAP[toast.type]}`}
          >
            <div className="flex items-start gap-2.5">
              <div className="shrink-0 mt-0.5">{ICON_MAP[toast.type]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#F8FAFC] leading-snug">
                  {toast.message}
                </p>
                {toast.detail && (
                  <p className="text-[0.65rem] text-[#94A3B8] mt-0.5">{toast.detail}</p>
                )}
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="shrink-0 text-[#64748B] hover:text-[#F8FAFC] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
