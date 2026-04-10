/* ── SIGNAL — Login Screen ────────────────────────────────────────────
   Full-screen immersive login with Shell branding, floating particles,
   gradient accents, and Framer Motion transitions.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useState, useMemo, useEffect, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Lock, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import GreetingTransition from "./GreetingTransition";

export default function LoginScreen() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [mounted, setMounted] = useState(false);

  /* Generate particle positions once on the client to prevent hydration mismatch */
  const particles = useMemo(
    () =>
      Array.from({ length: 30 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        duration: 6 + Math.random() * 10,
        delay: Math.random() * 8,
        size: 1 + Math.random() * 2,
      })),
    []
  );

  /* Wait for client mount before rendering particles */
  useEffect(() => setMounted(true), []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      setShowGreeting(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  /* After login → show JARVIS greeting overlay */
  if (showGreeting && user) {
    return <GreetingTransition user={user} />;
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#0A0E17]">
      {/* ── Background gradient layers ─────────────────────────── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(221,29,33,0.08)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(56,189,248,0.06)_0%,transparent_50%)]" />

      {/* ── Floating particles (only rendered after client mount to avoid hydration mismatch) */}
      {mounted && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <div
              key={p.id}
              className="particle"
              style={{
                left: `${p.left}%`,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
                width: `${p.size}px`,
                height: `${p.size}px`,
              }}
            />
          ))}
        </div>
      )}

      {/* ── Scan line effect ──────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
        <div className="w-full h-px bg-[#38BDF8] animate-scan-line" />
      </div>

      {/* ── Login Card ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Top accent bar */}
        <div className="h-[3px] rounded-t-2xl bg-gradient-to-r from-[#DD1D21] via-[#FBCE07] to-[#38BDF8]" />

        <div className="bg-gradient-to-b from-[#111827] to-[#0D1321] border border-[#1E293B] rounded-b-2xl p-8 sm:p-10 backdrop-blur-xl">
          {/* ── Branding ─────────────────────────────────────── */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-[#FBCE07]" />
                <span className="text-xs font-bold tracking-[0.3em] text-[#64748B] uppercase">
                  Secure Access
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F8FAFC] mb-2">
                Welcome to{" "}
                <span className="bg-gradient-to-r from-[#DD1D21] via-[#FBCE07] to-[#38BDF8] bg-clip-text text-transparent animate-shimmer">
                  SIGNAL
                </span>
              </h1>
              <p className="text-sm text-[#94A3B8] leading-relaxed">
                A Shell Intelligence System
              </p>
              <p className="text-[0.65rem] text-[#475569] tracking-[0.12em] uppercase mt-1">
                System for Intelligent Geopolitical News &amp; Asset Linking
              </p>
            </motion.div>
          </div>

          {/* ── Form ─────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[0.65rem] font-semibold tracking-[0.1em] text-[#64748B] uppercase mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@shell.com"
                required
                className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-lg px-4 py-3 text-sm text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-[0.65rem] font-semibold tracking-[0.1em] text-[#64748B] uppercase mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-lg px-4 py-3 text-sm text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]/30 transition-all pr-10"
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
              </div>
            </div>

            {/* ── Error Message ────────────────────────────── */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 text-sm text-[#EF4444] bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-lg px-3 py-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Submit Button ────────────────────────────── */}
            <button
              type="submit"
              disabled={loading}
              className="w-full relative bg-gradient-to-r from-[#DD1D21] to-[#B91C1C] hover:from-[#EF4444] hover:to-[#DD1D21] text-white font-bold py-3 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Shield className="w-4 h-4" />
                  Access SIGNAL
                </span>
              )}
              {/* Hover glow effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            </button>
          </form>

          {/* ── Footer info ──────────────────────────────── */}
          <div className="mt-6 pt-5 border-t border-[#1E293B]">
            <p className="text-[0.6rem] text-[#475569] text-center tracking-wide">
              Demo credentials: admin@shell.com / analyst@shell.com / viewer@shell.com — password: signal
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Bottom status bar ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-6 text-[0.6rem] text-[#475569] tracking-wide"
      >
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse-dot" />
          Systems Online
        </span>
        <span>Shell SIGNAL v2.0</span>
        <span>Encrypted Connection</span>
      </motion.div>
    </div>
  );
}
