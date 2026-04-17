/* ── ClientOnly — Hydration Mismatch Prevention ──────────────────────
   Renders nothing during SSR and hydration, then renders children
   after the component mounts on the client.  This eliminates ALL
   hydration mismatches from the app's component tree because there
   is no server-rendered HTML to compare against.

   Safe to use for auth-gated apps where SSR has no benefit.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useEffect, useState, type ReactNode } from "react";

export default function ClientOnly({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect -- one-time client mount detection
  }, []);

  if (!mounted) return null;

  return <>{children}</>;
}
