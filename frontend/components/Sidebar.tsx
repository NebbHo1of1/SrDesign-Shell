/* ── SIGNAL — Sidebar Navigation ──────────────────────────────────────
   Collapsible sidebar with Shell branding, nav links, system status.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Newspaper,
  BarChart3,
  Brain,
  Zap,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Crown,
  Settings,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { accessiblePaths } from "@/lib/permissions";

const API =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const NAV = [
  { href: "/dashboard", label: "Command Center", icon: LayoutDashboard },
  { href: "/dashboard/feed", label: "Intelligence Feed", icon: Newspaper },
  { href: "/dashboard/commodity", label: "Commodity View", icon: TrendingUp },
  { href: "/dashboard/analytics", label: "Data Analytics", icon: BarChart3 },
  { href: "/dashboard/model", label: "AI Model", icon: Brain },
  { href: "/dashboard/signals", label: "Signal Engine", icon: Zap },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const { user } = useAuth();
  const allowed = user ? accessiblePaths(user.role) : new Set<string>();
  const filteredNav = NAV.filter((item) => allowed.has(item.href));
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [hasData, setHasData] = useState<boolean | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API}/health`, { cache: "no-store" });
      setApiOnline(res.ok);
      if (res.ok) {
        // Also check if there are headlines
        const headlinesRes = await fetch(
          `${API}/headlines?commodity=WTI&limit=1`,
          { cache: "no-store" }
        );
        if (headlinesRes.ok) {
          const data = await headlinesRes.json();
          setHasData(Array.isArray(data) && data.length > 0);
        }
      }
    } catch {
      setApiOnline(false);
      setHasData(false);
    }
  }, []);

  useEffect(() => {
    // Use setTimeout(0) for initial check to avoid synchronous setState in effect
    const initial = setTimeout(checkHealth, 0);
    const interval = setInterval(checkHealth, 30_000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [checkHealth]);

  const statuses = [
    { label: "API Online", ok: apiOnline },
    { label: "Model Active", ok: apiOnline },
    { label: "News Feed Live", ok: hasData },
  ];

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-col h-full bg-gradient-to-b from-[#0D1321] to-[#111827] border-r border-[#1E293B] shrink-0"
    >
      {/* ── Brand ────────────────────────────────────────── */}
      <div className="px-4 py-5 border-b border-[#1E293B]">
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div
              key="full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <div className="text-lg font-extrabold tracking-[0.2em] text-[#FBCE07]">
                S.I.G.N.A.L.
              </div>
              <div className="text-[0.5rem] text-[#475569] tracking-[0.1em] mt-0.5">
                SHELL INTELLIGENCE SYSTEM
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="icon"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-[#FBCE07] font-extrabold text-sm"
            >
              S
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Executive Badge ──────────────────────────────── */}
      {user?.role === "Executive" && (
        <div className="px-3 py-2 border-b border-[#1E293B]">
          <AnimatePresence mode="wait">
            {!collapsed ? (
              <motion.div
                key="exec-badge-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#FFD700]/30 bg-[#FFD700]/5"
              >
                <Crown className="w-3.5 h-3.5 text-[#FFD700] shrink-0" />
                <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[#FFD700] uppercase">
                  Exec
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="exec-badge-icon"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-center"
              >
                <Crown className="w-4 h-4 text-[#FFD700]" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Nav Links ────────────────────────────────────── */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                active
                  ? "bg-[#1E293B] text-[#F8FAFC] border border-[#38BDF8]/30"
                  : "text-[#94A3B8] hover:bg-[#1E293B]/50 hover:text-[#E2E8F0]"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  active ? "text-[#38BDF8]" : "text-[#64748B] group-hover:text-[#94A3B8]"
                }`}
              />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* ── System Status ────────────────────────────────── */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-[#1E293B] space-y-1.5">
          <div className="text-[0.6rem] text-[#475569] tracking-[0.1em] font-bold uppercase mb-2">
            System Status
          </div>
          {statuses.map((s) => (
            <div key={s.label} className="flex items-center gap-2 text-xs text-[#94A3B8]">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  s.ok === null
                    ? "bg-[#F59E0B] animate-pulse"
                    : s.ok
                      ? "bg-[#22C55E] animate-pulse-dot"
                      : "bg-[#EF4444]"
                }`}
              />
              {s.label}
            </div>
          ))}
        </div>
      )}

      {/* ── Collapse Toggle ──────────────────────────────── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-7 w-6 h-6 bg-[#1E293B] border border-[#334155] rounded-full flex items-center justify-center text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155] transition-colors z-10"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>

      {/* ── Footer ───────────────────────────────────────── */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-[#1E293B] text-center">
          <p className="text-[0.5rem] text-[#334155] tracking-wide">
            Shell S.I.G.N.A.L. v2.0
          </p>
        </div>
      )}
    </motion.aside>
  );
}
