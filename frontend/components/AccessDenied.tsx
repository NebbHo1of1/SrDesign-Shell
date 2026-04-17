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
      <div className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-2xl p-10 max-w-md">
        <ShieldOff className="w-12 h-12 text-[#EF4444] mx-auto mb-4" />
        <h2 className="text-xl font-extrabold text-[#F8FAFC] mb-2">
          Access Restricted
        </h2>
        <p className="text-sm text-[#94A3B8] mb-1">
          Your current role{" "}
          <span className="font-bold text-[#FBCE07]">
            {user?.role ?? "Unknown"}
          </span>{" "}
          does not have permission to view this page.
        </p>
        <p className="text-xs text-[#64748B] mb-6">
          Contact your administrator to request elevated access.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#1E293B] to-[#334155] hover:from-[#334155] hover:to-[#475569] text-[#F8FAFC] font-bold text-sm px-5 py-2.5 rounded-lg transition-all duration-300 border border-[#475569]/30"
        >
          ← Back to Command Center
        </Link>
      </div>
    </div>
  );
}
