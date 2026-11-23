"use client";

import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { getSupabaseConfig } from "@/lib/supabase/config";

export type AuthState =
  /** Sign-in isn't configured (no Supabase env vars). */
  | { status: "unavailable"; user: null }
  /** Waiting for the browser client to read the session. */
  | { status: "loading"; user: null }
  | { status: "signed-out"; user: null }
  | { status: "signed-in"; user: { id: string; email: string | null } };

const AuthContext = createContext<AuthState>({ status: "loading", user: null });

/**
 * Shares the signed-in user with the app shell, read in the browser so every page can stay
 * prerendered. This is for showing the right UI only: the server re-checks the session in
 * every Route Handler and Server Action before touching data.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Same on server and client (env only), so hydration matches.
  const [state, setState] = useState<AuthState>(() =>
    getSupabaseConfig() ? { status: "loading", user: null } : { status: "unavailable", user: null },
  );

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    // Fires once straight away (INITIAL_SESSION), then on every sign-in, sign-out and refresh.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(
        session
          ? { status: "signed-in", user: { id: session.user.id, email: session.user.email ?? null } }
          : { status: "signed-out", user: null },
      );
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <AuthContext value={state}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  return use(AuthContext);
}

/** Signs out in the browser; the auth listener then updates every component. */
export async function signOut() {
  await getBrowserSupabase()?.auth.signOut();
}
