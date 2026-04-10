/* ── SIGNAL — Top Bar ─────────────────────────────────────────────────
   User info, role badge, notifications bell, system clock.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useAuth } from "@/lib/auth";
import { Bell, LogOut, Shield } from "lucide-react";
import { useEffect, useState } from "react";

const ROLE_COLORS: Record<string, string> = {
  Executive: "bg-[#FBCE07]/10 text-[#FBCE07] border-[#FBCE07]/30",
  Analyst: "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/30",
  Viewer: "bg-[#94A3B8]/10 text-[#94A3B8] border-[#94A3B8]/30",
};

export default function TopBar() {
  const { user, logout } = useAuth();
  const [time, setTime] = useState("");

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

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-[#1E293B] bg-[#0D1321]/80 backdrop-blur-lg shrink-0">
      {/* Left — SIGNAL wordmark */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-extrabold tracking-[0.15em] text-[#FBCE07]">
          SIGNAL
        </span>
        <span className="text-[0.6rem] text-[#475569] tracking-[0.08em] hidden sm:inline">
          CRUDE OIL INTELLIGENCE
        </span>
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
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#DD1D21] rounded-full animate-pulse-dot" aria-hidden="true" />
        </button>

        {/* Role badge */}
        <span
          className={`text-[0.6rem] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded-full border ${
            ROLE_COLORS[user.role] ?? ROLE_COLORS.Viewer
          }`}
        >
          <Shield className="w-3 h-3 inline mr-1" />
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
