/* ── SIGNAL Alert System (Simulated) ──────────────────────────────────
   Provides toast notifications and a persistent alert feed.
   Uses localStorage for alert config, context for real-time toasts.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { loadOnboarding, type AlertsConfig } from "@/lib/onboarding";

export interface AlertItem {
  id: string;
  message: string;
  detail?: string;
  severity: "critical" | "warning" | "info";
  timestamp: string;
  read: boolean;
}

export interface ToastItem {
  id: string;
  message: string;
  detail?: string;
  type: "success" | "warning" | "info";
}

interface AlertCtx {
  alerts: AlertItem[];
  toasts: ToastItem[];
  addAlert: (alert: Omit<AlertItem, "id" | "timestamp" | "read">) => void;
  showToast: (toast: Omit<ToastItem, "id">) => void;
  dismissToast: (id: string) => void;
  clearAlerts: () => void;
  alertConfig: AlertsConfig | null;
}

const AlertContext = createContext<AlertCtx>({
  alerts: [],
  toasts: [],
  addAlert: () => {},
  showToast: () => {},
  dismissToast: () => {},
  clearAlerts: () => {},
  alertConfig: null,
});

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [alertConfig, setAlertConfig] = useState<AlertsConfig | null>(null);

  useEffect(() => {
    const data = loadOnboarding();
    if (data?.alerts) {
      setTimeout(() => setAlertConfig(data.alerts), 0);
    }
  }, []);

  const addAlert = useCallback(
    (alert: Omit<AlertItem, "id" | "timestamp" | "read">) => {
      const newAlert: AlertItem = {
        ...alert,
        id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        read: false,
      };
      setAlerts((prev) => [newAlert, ...prev].slice(0, 50));
    },
    []
  );

  const showToast = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = { ...toast, id };
      setToasts((prev) => [...prev, newToast]);
      // Auto-dismiss after 5s
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return (
    <AlertContext.Provider
      value={{ alerts, toasts, addAlert, showToast, dismissToast, clearAlerts, alertConfig }}
    >
      {children}
    </AlertContext.Provider>
  );
}

export const useAlerts = () => useContext(AlertContext);
