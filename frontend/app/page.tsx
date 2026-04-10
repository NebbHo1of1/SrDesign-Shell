/* ── SIGNAL — Root Page (Login Gate) ──────────────────────────────────
   If not authenticated → login screen.
   If authenticated  → redirect to /dashboard.

   LoginScreen is loaded with next/dynamic ssr:false so its entire
   component tree (particles, framer-motion, etc.) is NEVER rendered on
   the server.  This is the definitive fix for the hydration mismatch.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import dynamic from "next/dynamic";

/* SSR disabled — LoginScreen uses Math.random() for particles and
   framer-motion animations that can produce hydration mismatches. */
const LoginScreen = dynamic(() => import("@/components/LoginScreen"), {
  ssr: false,
});

function Gate() {
  const { user, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    /* In dev mode the user is already set, so this fires immediately */
    if (isLoaded && user) router.replace("/dashboard");
  }, [user, isLoaded, router]);

  /* Show nothing while auth is still loading from localStorage */
  if (!isLoaded) return null;
  if (user) return null;        // will redirect above
  return <LoginScreen />;
}

export default function Home() {
  return <Gate />;
}
