"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import {
  ensureAnonymousSession,
  getCurrentSession,
  getSupabaseBrowserClient,
  isSupabaseConfigured,
  isAnonymousUser,
} from "@/lib/supabase";

export type AuthState = "loading" | "anonymous" | "authenticated" | "signed_out" | "error";

type AuthContextValue = {
  error: string | null;
  refresh: () => Promise<void>;
  state: AuthState;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applySession = useCallback((nextUser: User | null, accessToken?: string) => {
    setUser(nextUser);
    setState(
      nextUser
        ? isAnonymousUser(nextUser, accessToken)
          ? "anonymous"
          : "authenticated"
        : "signed_out",
    );
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    const session = await getCurrentSession();
    applySession(session?.user ?? null);
  }, [applySession]);

  useEffect(() => {
    let mounted = true;
    if (!isSupabaseConfigured()) {
      queueMicrotask(() => {
        if (mounted) {
          setState("error");
          setError("Faltan las variables públicas de Supabase.");
        }
      });
      return () => {
        mounted = false;
      };
    }
    const supabase = getSupabaseBrowserClient();

    const load = async () => {
      try {
        let session = await getCurrentSession();
        if (!session || isAnonymousUser(session.user, session.access_token)) {
          session = await ensureAnonymousSession();
        }
        if (mounted) applySession(session.user, session.access_token);
      } catch (nextError) {
        if (mounted) {
          setState("error");
          setError(nextError instanceof Error ? nextError.message : "No se pudo restaurar la sesión.");
        }
      }
    };

    void load();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) applySession(session?.user ?? null, session?.access_token);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const value = useMemo(
    () => ({ error, refresh, state, user }),
    [error, refresh, state, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthState() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthState debe usarse dentro de AuthProvider.");
  return context;
}
