/* ── Role-Based Access Control ────────────────────────────────────────
   Maps each role to the dashboard pages they can access.
   Executive = full access, Analyst = data & analysis, Viewer = read-only basics.

   Corporate hierarchy:
     Executive  → strategic decisions, full platform access
     Analyst    → data analysis, model insights, no signal engine
     Viewer     → operational overview, news feed, commodity prices
   ──────────────────────────────────────────────────────────────────── */

import type { Role } from "@/lib/auth";

/** All dashboard route paths that are access-controlled. */
const ALL_PAGES = [
  "/dashboard",
  "/dashboard/feed",
  "/dashboard/commodity",
  "/dashboard/analytics",
  "/dashboard/model",
  "/dashboard/signals",
] as const;

export type DashboardPath = (typeof ALL_PAGES)[number];

/**
 * Pages each role can access.
 * Executive: everything
 * Analyst:   all except Signal Engine (executive-level decision tool)
 * Viewer:    Command Center, Intelligence Feed, Commodity View only
 */
const ROLE_ACCESS: Record<Role, ReadonlySet<string>> = {
  Executive: new Set(ALL_PAGES),
  Analyst: new Set([
    "/dashboard",
    "/dashboard/feed",
    "/dashboard/commodity",
    "/dashboard/analytics",
    "/dashboard/model",
  ]),
  Viewer: new Set([
    "/dashboard",
    "/dashboard/feed",
    "/dashboard/commodity",
  ]),
};

/** Check whether a given role can access a dashboard path. */
export function canAccess(role: Role, path: string): boolean {
  return ROLE_ACCESS[role]?.has(path) ?? false;
}

/** Get the set of accessible paths for a role (for sidebar filtering). */
export function accessiblePaths(role: Role): ReadonlySet<string> {
  return ROLE_ACCESS[role] ?? new Set();
}
