/* ── Shell SIGNAL Auth Context ────────────────────────────────────────
   Simulated JWT-style auth for the demo.  In production this would
   integrate with Azure AD / OAuth2.  Stores user + role in context
   so every page can gate on permissions.

   Auth state is persisted to localStorage so sessions survive refresh.
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

export type Role = "Executive" | "Analyst" | "Viewer";

export interface User {
  name: string;
  email: string;
  role: Role;
}

interface AuthCtx {
  user: User | null;
  /** True once the provider has attempted to restore a session from localStorage. */
  isLoaded: boolean;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  /* Always start with null to match the server render.
     Load from localStorage in useEffect (client-only) to avoid hydration mismatch. */
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = loadStoredUser();
    if (stored) {
      setUser(stored); // eslint-disable-line react-hooks/set-state-in-effect -- restoring persisted auth on mount
    }
    setIsLoaded(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    /* simulate network delay for the immersive loading animation */
    await new Promise((r) => setTimeout(r, 1800));

    const entry = DEMO_USERS[email.toLowerCase()];
    if (!entry || entry.password !== password) {
      throw new Error("Invalid credentials. Access denied.");
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry.user));
    setUser(entry.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoaded, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
