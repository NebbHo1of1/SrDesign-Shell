/* ── SIGNAL — Dashboard Layout ────────────────────────────────────────
   Sidebar + top bar + content area.  Auth-gated.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ErrorBoundary from "@/components/ErrorBoundary";
import AlertSimulator from "@/components/AlertSimulator";
import CommandPalette from "@/components/CommandPalette";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !user) router.replace("/");
  }, [user, isLoaded, router]);

  /* While auth is still loading from localStorage, render nothing (avoids flash) */
  if (!isLoaded || !user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0A0E17]">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      <AlertSimulator />
      <CommandPalette />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGate>{children}</AuthGate>;
}
