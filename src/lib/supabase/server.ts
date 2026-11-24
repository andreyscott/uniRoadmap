import "server-only";
import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";

/**
 * A Supabase client for one request, reading and writing the auth cookies. Route Handlers and
 * Server Actions can set cookies, so a token refreshed here is saved. The only Server
 * Components that read the session are under /admin, where the proxy has already refreshed it.
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
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components can't set cookies. That's only reached under /admin, where the
          // proxy has already refreshed the session for this request.
        }
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
 * reads the cookie and must not be trusted on the server. Cached per request, so the admin
 * layout, page and checks share one verification.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) return null;
  const email = data.claims.email;
  return { id: data.claims.sub, email: typeof email === "string" ? email : null };
});
