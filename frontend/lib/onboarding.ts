/* ── Onboarding & Alert Configuration Store ──────────────────────────
   Persists user preferences to localStorage for the demo.
   ──────────────────────────────────────────────────────────────────── */

export interface AlertsConfig {
  commodities: ("WTI" | "Brent")[];
  wtiIncreaseThreshold: number;
  wtiDecreaseThreshold: number;
  brentIncreaseThreshold: number;
  brentDecreaseThreshold: number;
  notificationsEnabled: boolean;
  priorityAlertsOnly: boolean; // Executive-only
  email: string;
}

export interface OnboardingData {
  completed: boolean;
  alerts: AlertsConfig;
}

const ONBOARDING_KEY = "signal_onboarding";

const DEFAULT_ALERTS: AlertsConfig = {
  commodities: ["WTI"],
  wtiIncreaseThreshold: 5,
  wtiDecreaseThreshold: 5,
  brentIncreaseThreshold: 5,
  brentDecreaseThreshold: 5,
  notificationsEnabled: true,
  priorityAlertsOnly: false,
  email: "",
};

export function loadOnboarding(): OnboardingData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingData;
  } catch {
    return null;
  }
}

export function saveOnboarding(data: OnboardingData): void {
  localStorage.setItem(ONBOARDING_KEY, JSON.stringify(data));
}

export function getDefaultAlerts(): AlertsConfig {
  return { ...DEFAULT_ALERTS };
}

export function isOnboardingComplete(): boolean {
  const data = loadOnboarding();
  return data?.completed ?? false;
}
