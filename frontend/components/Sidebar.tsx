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
  { href: "/dashboard/model", label: "Direction Model", icon: Brain },
  { href: "/dashboard/forecast", label: "Price Forecast", icon: TrendingUp },
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
      className="relative z-10 flex flex-col h-full bg-gradient-to-b from-[var(--shell-panel)] to-[var(--shell-card-2)] border-r border-[var(--shell-border)]/60 shrink-0 overflow-visible"
    >
      {/* ── Brand ────────────────────────────────────────── */}
      <div className="px-4 py-5 border-b border-[var(--shell-border)]">
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
              <div className="text-[0.5rem] text-[var(--shell-muted-3)] tracking-[0.1em] mt-0.5">
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
        <div className="px-3 py-2 border-b border-[var(--shell-border)]">
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
                  ? "bg-[var(--shell-border)] text-[var(--shell-text-bright)] border border-[#38BDF8]/30"
                  : "text-[var(--shell-muted)] hover:bg-[var(--shell-border)]/50 hover:text-[var(--shell-text)]"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  active ? "text-[#38BDF8]" : "text-[var(--shell-muted-2)] group-hover:text-[var(--shell-muted)]"
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
        <div className="px-4 py-3 border-t border-[var(--shell-border)] space-y-1.5">
          <div className="text-[0.6rem] text-[var(--shell-muted-3)] tracking-[0.1em] font-bold uppercase mb-2">
            System Status
          </div>
          {statuses.map((s) => (
            <div key={s.label} className="flex items-center gap-2 text-xs text-[var(--shell-muted)]">
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
        className="absolute -right-3.5 top-7 w-7 h-7 bg-[var(--shell-card)] border border-[var(--shell-border-2)]/80 rounded-full flex items-center justify-center text-[var(--shell-muted)] hover:text-[#FBCE07] hover:border-[#FBCE07]/40 transition-all duration-200 z-50 shadow-md shadow-black/30"
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>

      {/* ── Footer ───────────────────────────────────────── */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-[var(--shell-border)] text-center">
          <p className="text-[0.5rem] text-[var(--shell-border-2)] tracking-wide">
            Shell S.I.G.N.A.L. v2.0
          </p>
        </div>
      )}
    </motion.aside>
  );
}
