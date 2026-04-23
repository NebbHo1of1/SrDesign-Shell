/* ── SIGNAL — Create Account Page ─────────────────────────────────────
   Full-screen immersive registration with Shell branding.
   Fields: name, email (@shell.com), password, confirm, access code.
   Role is assigned ONLY by access code.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Lock,
  AlertCircle,
  Loader2,
  User,
  Mail,
  Key,
  CheckCircle2,
} from "lucide-react";
import { useAuth, type Role } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

const ACCESS_CODE_MAP: Record<string, { role: Role; label: string }> = {
  "SIGNAL-EXEC-01": { role: "Executive", label: "Executive Access" },
  "SIGNAL-ANL-01": { role: "Analyst", label: "Analyst Access" },
};

export default function RegisterPage() {
  const { user, register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeValidation, setCodeValidation] = useState<{
    valid: boolean;
    role: Role;
    label: string;
  } | null>(null);

  /* Track whether we're in the middle of registration so the redirect
     useEffect doesn't race with the role-based routing in handleSubmit. */
  const isRegistering = useRef(false);

  /* Redirect if already logged in (but NOT if we just registered — handleSubmit
     does its own role-based redirect in that case). */
  useEffect(() => {
    if (user && !isRegistering.current) router.replace("/dashboard");
  }, [user, router]);

  /* Real-time access code validation */
  useEffect(() => {
    const trimmed = accessCode.trim().toUpperCase();
    const match = ACCESS_CODE_MAP[trimmed];
    if (match) {
      setCodeValidation({ valid: true, ...match });
    } else if (trimmed.length > 0) {
      setCodeValidation(null);
    } else {
      setCodeValidation(null);
    }
  }, [accessCode]);

  /* Particle positions (client-only) */
  const [particles, setParticles] = useState<
    Array<{ id: number; left: number; duration: number; delay: number; size: number }>
  >([]);
  useEffect(() => {
    setParticles(
      Array.from({ length: 25 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        duration: 6 + Math.random() * 10,
        delay: Math.random() * 8,
        size: 1 + Math.random() * 2,
      }))
    );
  }, []);

  const isExecCode = codeValidation?.role === "Executive";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    /* Validation */
    if (!name.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!email.toLowerCase().endsWith("@shell.com")) {
      setError("Email must end with @shell.com");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      isRegistering.current = true;
      const newUser = await register(name.trim(), email.trim(), password, accessCode.trim());

      if (newUser.role === "Viewer") {
        /* Viewers skip onboarding */
        router.replace("/dashboard");
      } else if (newUser.role === "Executive") {
        /* Executive gets special experience first */
        router.replace("/onboarding?exec=1");
      } else {
        /* Analyst goes to onboarding */
        router.replace("/onboarding");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[var(--shell-bg)]">
      <ThemeToggle />
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(221,29,33,0.08)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(56,189,248,0.06)_0%,transparent_50%)]" />
      {isExecCode && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,215,0,0.06)_0%,transparent_60%)] transition-opacity duration-1000" />
      )}

      {/* Particles */}
      {particles.length > 0 && (
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

      {/* Scan line */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
        <div className="w-full h-px bg-[#38BDF8] animate-scan-line" />
      </div>

      {/* Registration Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-lg mx-4"
      >
        {/* Top accent bar */}
        <div
          className={`h-[3px] rounded-t-2xl transition-all duration-700 ${
            isExecCode
              ? "bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.3)]"
              : "bg-gradient-to-r from-[#DD1D21] via-[#FBCE07] to-[#38BDF8]"
          }`}
        />

        <div className="bg-gradient-to-b from-[var(--shell-card-2)] to-[var(--shell-panel)] border border-[var(--shell-border)] rounded-b-2xl p-8 sm:p-10 backdrop-blur-xl">
          {/* Branding */}
          <div className="text-center mb-6">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-[#FBCE07]" />
                <span className="text-xs font-bold tracking-[0.3em] text-[var(--shell-muted-2)] uppercase">
                  Create Account
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--shell-text-bright)] mb-1">
                Join{" "}
                <span className="bg-gradient-to-r from-[#DD1D21] via-[#FBCE07] to-[#38BDF8] bg-clip-text text-transparent animate-shimmer">
                  SIGNAL
                </span>
              </h1>
              <p className="text-[0.65rem] text-[var(--shell-muted-3)] tracking-[0.12em] uppercase">
                Shell Intelligence System Registration
              </p>
            </motion.div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-[0.65rem] font-semibold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alexandra Chen"
                  required
                  className="w-full bg-[var(--shell-bg)] border border-[var(--shell-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--shell-text-bright)] placeholder-[var(--shell-muted-3)] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]/30 transition-all pr-10"
                />
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--shell-muted-3)]" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[0.65rem] font-semibold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase mb-1.5">
                Shell Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@shell.com"
                  required
                  className="w-full bg-[var(--shell-bg)] border border-[var(--shell-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--shell-text-bright)] placeholder-[var(--shell-muted-3)] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]/30 transition-all pr-10"
                />
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--shell-muted-3)]" />
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[0.65rem] font-semibold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-[var(--shell-bg)] border border-[var(--shell-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--shell-text-bright)] placeholder-[var(--shell-muted-3)] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]/30 transition-all pr-10"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--shell-muted-3)]" />
                </div>
              </div>
              <div>
                <label className="block text-[0.65rem] font-semibold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase mb-1.5">
                  Confirm
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[var(--shell-bg)] border border-[var(--shell-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--shell-text-bright)] placeholder-[var(--shell-muted-3)] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]/30 transition-all"
                />
              </div>
            </div>

            {/* Access Code */}
            <div>
              <label className="block text-[0.65rem] font-semibold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase mb-1.5">
                Access Code <span className="text-[var(--shell-muted-3)]">(optional)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Enter access code for elevated privileges"
                  className={`w-full bg-[var(--shell-bg)] border rounded-lg px-4 py-2.5 text-sm text-[var(--shell-text-bright)] placeholder-[var(--shell-muted-3)] focus:outline-none transition-all duration-500 pr-10 ${
                    isExecCode
                      ? "border-[#FFD700]/60 ring-2 ring-[#FFD700]/20 shadow-[0_0_15px_rgba(255,215,0,0.15)]"
                      : codeValidation?.valid
                        ? "border-[#22C55E]/60 ring-1 ring-[#22C55E]/20"
                        : "border-[var(--shell-border)] focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]/30"
                  }`}
                />
                <Key className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                  isExecCode ? "text-[#FFD700]" : codeValidation?.valid ? "text-[#22C55E]" : "text-[var(--shell-muted-3)]"
                }`} />
              </div>

              {/* Code validation feedback */}
              <AnimatePresence>
                {codeValidation?.valid && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`flex items-center gap-2 mt-2 text-xs ${
                      isExecCode ? "text-[#FFD700]" : "text-[#22C55E]"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="font-medium">
                      {isExecCode
                        ? "Executive access code validated"
                        : `${codeValidation.label} code validated`}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Error */}
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full relative font-bold py-3 rounded-lg transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden text-white ${
                isExecCode
                  ? "bg-gradient-to-r from-[#B8860B] to-[#DAA520] hover:from-[#DAA520] hover:to-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.2)]"
                  : "bg-gradient-to-r from-[#DD1D21] to-[#B91C1C] hover:from-[#EF4444] hover:to-[#DD1D21]"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Account…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Shield className="w-4 h-4" />
                  Create Account
                </span>
              )}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            </button>
          </form>

          {/* Footer */}
          <div className="mt-5 pt-4 border-t border-[var(--shell-border)] text-center">
            <p className="text-xs text-[var(--shell-muted-2)]">
              Already have an account?{" "}
              <Link href="/" className="text-[#38BDF8] hover:text-[#7DD3FC] font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Bottom status */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-6 text-[0.6rem] text-[var(--shell-muted-3)] tracking-wide"
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
