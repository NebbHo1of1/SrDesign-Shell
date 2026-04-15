/* ── Login Gate (Client Component) ─────────────────────────────────────
   Shows the login screen when not authenticated.
   Redirects to /dashboard when the user is already logged in.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import { isOnboardingComplete } from "@/lib/onboarding";

/* SSR disabled — LoginScreen uses Math.random() for particles and
   framer-motion animations that can produce hydration mismatches. */
const LoginScreen = dynamic(() => import("@/components/LoginScreen"), {
  ssr: false,
});

export default function LoginGate() {
  const { user, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && user) {
      /* Viewers always go to dashboard; Analyst/Executive may need onboarding */
      if (user.role === "Viewer" || isOnboardingComplete()) {
        router.replace("/dashboard");
      } else if (user.role === "Executive") {
        router.replace("/onboarding?exec=1");
      } else {
        router.replace("/onboarding");
      }
    }
  }, [user, isLoaded, router]);

  /* Show nothing while auth is still loading from localStorage */
  if (!isLoaded) return null;
  if (user) return null; // will redirect above
  return <LoginScreen />;
}
