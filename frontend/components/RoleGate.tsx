/* ── Role Gate — Page-Level Access Control ────────────────────────────
   Wraps a page component and checks the current user's role against
   the required permission path.  If the user lacks access, shows the
   AccessDenied screen instead of the page content.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useAuth } from "@/lib/auth";
import { canAccess, type DashboardPath } from "@/lib/permissions";
import AccessDenied from "./AccessDenied";
import type { ReactNode } from "react";

interface Props {
  /** The dashboard path being guarded (e.g. "/dashboard/analytics"). */
  page: DashboardPath;
  children: ReactNode;
}

export default function RoleGate({ page, children }: Props) {
  const { user } = useAuth();

  if (!user) return null; // auth gate in layout handles redirect
  if (!canAccess(user.role, page)) return <AccessDenied />;

  return <>{children}</>;
}
