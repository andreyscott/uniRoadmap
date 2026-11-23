import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";

/**
 * A Supabase client for one request, reading and writing the auth cookies. Use it only in
 * Route Handlers and Server Actions: those can set cookies, so a token refreshed here is
 * saved. (Pages stay static and never read the session.)
 *
 * Returns null when Supabase isn't configured.
 */
export async function createServerSupabase(): Promise<SupabaseClient | null> {
  const config = getSupabaseConfig();
  if (!config) return null;
  const cookieStore = await cookies();

  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
      },
    },
  });
}

export interface SessionUser {
  id: string;
  email: string | null;
}

/**
 * The signed-in user, verified on the server, or null. getClaims() checks the JWT signature
 * (locally when the project uses asymmetric signing keys), unlike getSession(), which only
 * reads the cookie and must not be trusted on the server.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) return null;
  const email = data.claims.email;
  return { id: data.claims.sub, email: typeof email === "string" ? email : null };
}
