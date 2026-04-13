"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// ============================================================
// PART 1 — Types & storage (desktop offline-first)
// ============================================================

export interface AuthUser {
  id: string;
  email?: string;
  displayName?: string;
}

const STORAGE_KEY = "eh-desktop-auth-user";

function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  signInDemo: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

// ============================================================
// PART 2 — Provider
// ============================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [loading] = useState(false);

  const signInDemo = useCallback(() => {
    const next: AuthUser = { id: "desktop-local", displayName: "Local user" };
    setUser(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota */
    }
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, signInDemo, signOut }),
    [user, loading, signInDemo, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
