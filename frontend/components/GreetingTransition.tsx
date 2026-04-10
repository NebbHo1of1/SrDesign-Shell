/* ── SIGNAL — Post-Login JARVIS Greeting ──────────────────────────────
   Full-screen cinematic transition after successful auth.
   Fades in the user greeting, system status, then auto-redirects.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/auth";

interface Props {
  user: User;
}

export default function GreetingTransition({ user }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState(0); // 0 → name, 1 → status, 2 → redirect

  /* Compute greeting once on mount — safe because this component is only
     rendered client-side after a successful login action. */
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1200);
    const t2 = setTimeout(() => setPhase(2), 3000);
    const t3 = setTimeout(() => router.replace("/dashboard"), 4200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [router]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0A0E17] overflow-hidden">
      {/* Background subtle glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(56,189,248,0.04)_0%,transparent_70%)]" />

      {/* Greeting name */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="text-center z-10"
      >
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#F8FAFC]">
          {greeting},{" "}
          <span className="bg-gradient-to-r from-[#FBCE07] to-[#38BDF8] bg-clip-text text-transparent">
            {user.name.split(" ")[0]}
          </span>
          .
        </h1>
      </motion.div>

      {/* System status message */}
      {phase >= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mt-6 text-center z-10"
        >
          <p className="text-[#94A3B8] text-lg">
            SIGNAL is{" "}
            <span className="text-[#22C55E] font-semibold">online</span>.
          </p>
          <p className="text-[#64748B] text-sm mt-1">
            Monitoring global oil markets and geopolitical activity.
          </p>
        </motion.div>
      )}

      {/* Loading bar / transition indicator */}
      {phase >= 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-10 w-64 z-10"
        >
          <div className="h-[2px] bg-[#1E293B] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2.5, ease: "easeInOut" }}
              className="h-full bg-gradient-to-r from-[#DD1D21] via-[#FBCE07] to-[#38BDF8]"
            />
          </div>
          <p className="text-[0.6rem] text-[#475569] text-center mt-2 tracking-[0.15em] uppercase">
            Initializing Command Center…
          </p>
        </motion.div>
      )}

      {/* Fade to white on redirect */}
      {phase >= 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2 }}
          className="fixed inset-0 bg-[#0A0E17] z-50"
        />
      )}
    </div>
  );
}
