/* ── Login Gate (Client Component) ─────────────────────────────────────
   Shows the login screen when not authenticated.
   Redirects to /dashboard when the user is already logged in.
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

export default function LoginGate() {
  const { user, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && user) router.replace("/dashboard");
  }, [user, isLoaded, router]);

  /* Show nothing while auth is still loading from localStorage */
  if (!isLoaded) return null;
  if (user) return null; // will redirect above
  return <LoginScreen />;
}
