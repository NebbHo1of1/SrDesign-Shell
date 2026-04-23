/* ── Access Denied Component ──────────────────────────────────────────
   Shown when a user navigates to a page their role cannot access.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { ShieldOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

export default function AccessDenied() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-4">
      <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-2xl p-10 max-w-md">
        <ShieldOff className="w-12 h-12 text-[#EF4444] mx-auto mb-4" />
        <h2 className="text-xl font-extrabold text-[var(--shell-text-bright)] mb-2">
          Access Restricted
        </h2>
        <p className="text-sm text-[var(--shell-muted)] mb-1">
          Your current role{" "}
          <span className="font-bold text-[#FBCE07]">
            {user?.role ?? "Unknown"}
          </span>{" "}
          does not have permission to view this page.
        </p>
        <p className="text-xs text-[var(--shell-muted-2)] mb-6">
          Contact your administrator to request elevated access.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[var(--shell-border)] to-[var(--shell-border-2)] hover:from-[var(--shell-border-2)] hover:to-[var(--shell-muted-3)] text-[var(--shell-text-bright)] font-bold text-sm px-5 py-2.5 rounded-lg transition-all duration-300 border border-[var(--shell-muted-3)]/30"
        >
          ← Back to Command Center
        </Link>
      </div>
    </div>
  );
}
