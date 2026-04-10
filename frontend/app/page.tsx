/* ── SIGNAL — Root Page (Login Gate) ──────────────────────────────────
   DEV_MODE on  → server-side redirect to /dashboard (login never renders).
   DEV_MODE off → client-side LoginGate (normal auth flow).
   ──────────────────────────────────────────────────────────────────── */

import { redirect } from "next/navigation";
import { DEV_MODE } from "@/lib/config";
import LoginGate from "./LoginGate";

export default function Home() {
  if (DEV_MODE) redirect("/dashboard");
  return <LoginGate />;
}
