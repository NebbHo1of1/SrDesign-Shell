/* ── SIGNAL — Root Page (Login Gate) ──────────────────────────────────
   If not authenticated → login screen.
   If authenticated  → redirect to /dashboard.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useAuth } from "@/lib/auth";
import LoginScreen from "@/components/LoginScreen";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function Gate() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  if (user) return null;
  return <LoginScreen />;
}

export default function Home() {
  return <Gate />;
}
