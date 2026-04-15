/* ── SIGNAL — Top Bar ─────────────────────────────────────────────────
   User info, role badge, notifications bell, system clock.
   Executive users get a gold "Executive Mode" indicator.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useAuth } from "@/lib/auth";
import { useAlerts } from "@/lib/alerts";
import { Bell, LogOut, Shield, Crown } from "lucide-react";
import { useEffect, useState } from "react";

const ROLE_COLORS: Record<string, string> = {
  Executive: "bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30",
  Analyst: "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/30",
  Viewer: "bg-[#94A3B8]/10 text-[#94A3B8] border-[#94A3B8]/30",
};

export default function TopBar() {
  const { user, logout } = useAuth();
  const { alerts } = useAlerts();
  const [time, setTime] = useState("");

  const unreadCount = alerts.filter((a) => !a.read).length;

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "UTC",
          timeZoneName: "short",
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!user) return null;

  const isExec = user.role === "Executive";

  return (
    <header className={`flex items-center justify-between px-6 py-3 border-b bg-[#0D1321]/80 backdrop-blur-lg shrink-0 ${
      isExec ? "border-[#FFD700]/10" : "border-[#1E293B]"
    }`}>
      {/* Left — SIGNAL wordmark */}
      <div className="flex items-center gap-3">
        <span className={`text-sm font-extrabold tracking-[0.15em] ${isExec ? "text-[#FFD700]" : "text-[#FBCE07]"}`}>
          SIGNAL
        </span>
        <span className="text-[0.6rem] text-[#475569] tracking-[0.08em] hidden sm:inline">
          CRUDE OIL INTELLIGENCE
        </span>
        {/* Executive Mode indicator */}
        {isExec && (
          <span className="hidden md:inline-flex items-center gap-1 text-[0.55rem] font-bold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full bg-[#FFD700]/5 text-[#FFD700] border border-[#FFD700]/20">
            <Crown className="w-3 h-3" />
            Executive Mode
          </span>
        )}
      </div>

      {/* Right — user / notifications / clock */}
      <div className="flex items-center gap-4">
        {/* Clock */}
        <span className="text-xs text-[#64748B] font-mono hidden md:inline">
          {time}
        </span>

        {/* Notification bell */}
        <button
          className="relative text-[#64748B] hover:text-[#F8FAFC] transition-colors"
          aria-label="Notifications — new alerts available"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 ? (
            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-[#DD1D21] rounded-full text-[0.5rem] text-white font-bold flex items-center justify-center px-0.5 animate-pulse-dot" aria-hidden="true">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#DD1D21] rounded-full animate-pulse-dot" aria-hidden="true" />
          )}
        </button>

        {/* Role badge */}
        <span
          className={`text-[0.6rem] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded-full border ${
            ROLE_COLORS[user.role] ?? ROLE_COLORS.Viewer
          }`}
        >
          {isExec ? (
            <Crown className="w-3 h-3 inline mr-1" />
          ) : (
            <Shield className="w-3 h-3 inline mr-1" />
          )}
          {user.role}
        </span>

        {/* User name */}
        <span className="text-xs text-[#94A3B8] font-medium hidden sm:inline">
          {user.name}
        </span>

        {/* Logout */}
        <button
          onClick={logout}
          className="text-[#64748B] hover:text-[#EF4444] transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
