"use client";

import { useAuth } from "@/lib/auth";
import { useTheme, type Theme } from "@/lib/theme";
import { LogOut, Shield, Crown, Command, Moon, Sun, Circle } from "lucide-react";
import { useEffect, useState } from "react";
import NotificationCenter from "@/components/NotificationCenter";

const ROLE_COLORS: Record<string, string> = {
  Executive: "bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30",
  Analyst: "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/30",
  Viewer: "bg-[var(--shell-muted)]/10 text-[var(--shell-muted)] border-[var(--shell-muted)]/30",
};

const THEME_CYCLE: Theme[] = ["dark", "black", "light"];

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === "light") return <Sun className="w-3.5 h-3.5" />;
  if (theme === "black") return <Circle className="w-3.5 h-3.5 fill-current" />;
  return <Moon className="w-3.5 h-3.5" />;
}

export default function TopBar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
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

  const isExec = user.role === "Executive";

  const cycleTheme = () => {
    const idx = THEME_CYCLE.indexOf(theme);
    setTheme(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]);
  };

  return (
    <header className={`relative z-50 flex items-center justify-between px-6 py-3 border-b bg-[var(--shell-panel)]/80 backdrop-blur-lg shrink-0 ${
      isExec ? "border-[#FFD700]/10" : "border-[var(--shell-border)]"
    }`}>
      {/* Left — SIGNAL wordmark */}
      <div className="flex items-center gap-3">
        <span className={`text-sm font-extrabold tracking-[0.15em] ${isExec ? "text-[#FFD700]" : "text-[#FBCE07]"}`}>
          SIGNAL
        </span>
        <span className="text-[0.6rem] text-[var(--shell-muted-3)] tracking-[0.08em] hidden sm:inline">
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
        <span className="text-xs text-[var(--shell-muted-2)] font-mono hidden md:inline">
          {time}
        </span>

        {/* Theme cycle button */}
        <button
          onClick={cycleTheme}
          className="hidden sm:flex items-center gap-1.5 text-[0.6rem] text-[var(--shell-muted-3)] hover:text-[var(--shell-muted)] bg-[var(--shell-card)] border border-[var(--shell-border)] rounded-lg px-2 py-1 transition-colors capitalize"
          title={`Theme: ${theme} — click to cycle`}
        >
          <ThemeIcon theme={theme} />
          <span className="hidden md:inline">{theme}</span>
        </button>

        {/* Cmd+K hint */}
        <button
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
          }}
          className="hidden sm:flex items-center gap-1.5 text-[0.6rem] text-[var(--shell-muted-3)] hover:text-[var(--shell-muted)] bg-[var(--shell-card)] border border-[var(--shell-border)] rounded-lg px-2 py-1 transition-colors"
          title="Search (⌘K)"
        >
          <Command className="w-3 h-3" />
          <span>K</span>
        </button>

        {/* Notification Center */}
        <NotificationCenter />

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
        <span className="text-xs text-[var(--shell-muted)] font-medium hidden sm:inline">
          {user.name}
        </span>

        {/* Logout */}
        <button
          onClick={logout}
          className="text-[var(--shell-muted-2)] hover:text-[#EF4444] transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
