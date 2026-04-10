/* ── Shell SIGNAL Auth Context ────────────────────────────────────────
   Simulated JWT-style auth for the demo.  In production this would
   integrate with Azure AD / OAuth2.  Stores user + role in context
   so every page can gate on permissions.

   Auth state is persisted to localStorage so sessions survive refresh.

   IMPORTANT: `user` and `isLoaded` are stored in a SINGLE state object
   so that they always update atomically.  This prevents intermediate
   renders where `isLoaded=true` but `user` is still null — which would
   cause the dashboard AuthGate to redirect back to "/".
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
import { DEV_MODE } from "@/lib/config";

export type Role = "Executive" | "Analyst" | "Viewer";

export interface User {
  name: string;
  email: string;
  role: Role;
}

interface AuthState {
  user: User | null;
  /** True once the provider has attempted to restore a session from localStorage. */
  isLoaded: boolean;
}

interface AuthCtx extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const STORAGE_KEY = "signal_user";

const AuthContext = createContext<AuthCtx>({
  user: null,
  isLoaded: false,
  login: async () => {},
  logout: () => {},
});

/* ⚠️ DEMO ONLY — In production, replace with Azure AD / OAuth2 / JWT.
   These hardcoded credentials exist solely for demo presentations.
   Never use this pattern in production deployments. */
const DEMO_USERS: Record<string, { password: string; user: User }> = {
  "admin@shell.com": {
    password: "signal",
    user: { name: "Alexandra Chen", email: "admin@shell.com", role: "Executive" },
  },
  "analyst@shell.com": {
    password: "signal",
    user: { name: "Marcus Rivera", email: "analyst@shell.com", role: "Analyst" },
  },
  "viewer@shell.com": {
    password: "signal",
    user: { name: "Sarah Mitchell", email: "viewer@shell.com", role: "Viewer" },
  },
};

function loadStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

const DEV_USER: User = {
  name: "Dev Mode",
  email: "admin@shell.com",
  role: "Executive",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  /* When DEV_MODE is on, start already authenticated — no useEffect needed.
     When off, start with isLoaded=false and restore from localStorage. */
  const [auth, setAuth] = useState<AuthState>(
    DEV_MODE
      ? { user: DEV_USER, isLoaded: true }
      : { user: null, isLoaded: false }
  );

  useEffect(() => {
    if (DEV_MODE) return; // already loaded above
    const stored = loadStoredUser();
    /* Single setState call — no intermediate render where isLoaded=true but user=null */
    setAuth({ user: stored, isLoaded: true }); // eslint-disable-line react-hooks/set-state-in-effect -- restoring persisted auth on mount
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    /* simulate network delay for the immersive loading animation */
    await new Promise((r) => setTimeout(r, 1800));

    const entry = DEMO_USERS[email.toLowerCase()];
    if (!entry || entry.password !== password) {
      throw new Error("Invalid credentials. Access denied.");
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry.user));
    setAuth({ user: entry.user, isLoaded: true });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAuth({ user: null, isLoaded: true });
  }, []);

  return (
    <AuthContext.Provider value={{ user: auth.user, isLoaded: auth.isLoaded, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
