/* ── Shell SIGNAL Auth Context ────────────────────────────────────────
   Simulated JWT-style auth for the demo.  In production this would
   integrate with Azure AD / OAuth2.  Stores user + role in context
   so every page can gate on permissions.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
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
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  login: async () => {},
  logout: () => {},
});

/* Demo credential map — replace with real auth in production */
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    /* simulate network delay for the immersive loading animation */
    await new Promise((r) => setTimeout(r, 1800));

    const entry = DEMO_USERS[email.toLowerCase()];
    if (!entry || entry.password !== password) {
      throw new Error("Invalid credentials. Access denied.");
    }
    setUser(entry.user);
  }, []);

  const logout = useCallback(() => setUser(null), []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
