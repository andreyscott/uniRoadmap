"use client";

import { createContext, use, useEffect, useState, type ReactNode } from "react";
import type { MeResponse } from "@/app/api/me/route";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { getSupabaseConfig } from "@/lib/supabase/config";

export type AuthState =
  /** Sign-in isn't configured (no Supabase env vars). */
  | { status: "unavailable"; user: null }
  /** Waiting for the browser client to read the session. */
  | { status: "loading"; user: null }
  | { status: "signed-out"; user: null }
  | { status: "signed-in"; user: { id: string; email: string | null } };

/** Account extras from /api/me, once loaded (null until then, or when signed out). */
export type Profile = MeResponse;

const AuthContext = createContext<AuthState>({ status: "loading", user: null });
const ProfileContext = createContext<{ profile: Profile | null; reload: () => void }>({
  profile: null,
  reload: () => {},
});

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

  // The profile is tagged with whose it is, so another account never sees it.
  const userId = state.status === "signed-in" ? state.user.id : null;
  const [loaded, setLoaded] = useState<{ userId: string; version: number; profile: Profile } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch("/api/me", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<Profile>) : null))
      .then((profile) => {
        if (!cancelled && profile) setLoaded({ userId, version, profile });
      })
      .catch(() => {
        // Not critical: the admin link and "My university" just stay hidden.
      });
    return () => {
      cancelled = true;
    };
  }, [userId, version]);

  const profile = loaded && loaded.userId === userId ? loaded.profile : null;

  return (
    <AuthContext value={state}>
      <ProfileContext value={{ profile, reload: () => setVersion((v) => v + 1) }}>{children}</ProfileContext>
    </AuthContext>
  );
}

export function useAuth(): AuthState {
  return use(AuthContext);
}

/** The signed-in user's profile (admin access, "My university"), and a way to reload it. */
export function useProfile() {
  return use(ProfileContext);
}

/** Signs out in the browser; the auth listener then updates every component. */
export async function signOut() {
  await getBrowserSupabase()?.auth.signOut();
}
