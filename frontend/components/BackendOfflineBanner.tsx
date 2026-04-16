/* ── Backend Offline Banner ────────────────────────────────────────────
   Shown at the top of the dashboard when the backend API is unreachable.
   Polls /health every 15 s and auto-dismisses once the backend comes up.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, RefreshCw, Terminal } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export default function BackendOfflineBanner() {
  const [offline, setOffline] = useState<boolean | null>(null); // null = checking
  const [checking, setChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch(`${API}/health`, { cache: "no-store" });
      setOffline(!res.ok);
    } catch {
      setOffline(true);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const id = setInterval(checkHealth, 15_000);
    return () => clearInterval(id);
  }, [checkHealth]);

  // Don't render anything while first check is pending or backend is online
  if (offline === null || offline === false) return null;

  return (
    <div className="mx-6 mt-4 mb-0 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#EF4444]">
            Backend API is not reachable
          </p>
          <p className="text-xs text-[#F87171] mt-1">
            The frontend cannot connect to <code className="bg-[#1E293B] px-1.5 py-0.5 rounded text-[#F8FAFC] font-mono">{API}</code>.
            Start the backend in a separate terminal:
          </p>
          <div className="mt-2 bg-[#0A0E17] border border-[#1E293B] rounded-lg p-3 font-mono text-xs text-[#94A3B8] space-y-0.5">
            <div className="flex items-center gap-2 text-[#64748B] mb-1">
              <Terminal className="w-3.5 h-3.5" />
              <span className="text-[0.65rem] uppercase tracking-wider font-semibold">
                Run from project root
              </span>
            </div>
            <p><span className="text-[#22C55E]">$</span> pip install -r requirements.txt</p>
            <p><span className="text-[#22C55E]">$</span> uvicorn backend.main:app --reload</p>
          </div>
        </div>
        <button
          onClick={checkHealth}
          disabled={checking}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#F8FAFC] bg-[#EF4444]/20 hover:bg-[#EF4444]/30 border border-[#EF4444]/40 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3 h-3 ${checking ? "animate-spin" : ""}`} />
          Retry
        </button>
      </div>
    </div>
  );
}
