/* ── SIGNAL — Floating Theme Toggle ───────────────────────────────────
   Small fixed-position button used on auth / onboarding screens.
   Cycles: dark → black → light → dark.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { Moon, Sun, Circle } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme";

const LABELS: Record<Theme, string> = {
  dark: "Dark",
  black: "Black",
  light: "Light",
};

const CYCLE: Record<Theme, Theme> = {
  dark: "black",
  black: "light",
  light: "dark",
};

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = CYCLE[theme];

  return (
    <button
      onClick={() => setTheme(next)}
      title={`Switch to ${LABELS[next]} mode`}
      className="fixed top-4 right-4 z-50 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--shell-card)] border border-[var(--shell-border)] text-[var(--shell-muted)] hover:text-[var(--shell-text-bright)] hover:border-[var(--shell-border-2)] transition-all text-[0.65rem] font-semibold tracking-wide shadow-md"
    >
      {theme === "light" ? (
        <Sun className="w-3.5 h-3.5" />
      ) : theme === "black" ? (
        <Circle className="w-3.5 h-3.5 fill-current" />
      ) : (
        <Moon className="w-3.5 h-3.5" />
      )}
      <span className="hidden sm:inline">{LABELS[theme]}</span>
    </button>
  );
}
