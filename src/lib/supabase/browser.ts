import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";

let client: SupabaseClient | null | undefined;

/**
 * The browser Supabase client (one per tab), or null when Supabase isn't configured.
 * It keeps the session in cookies and refreshes tokens itself, which is why the app doesn't
 * need a proxy (middleware) to refresh sessions: no Server Component reads the session.
 */
export function getBrowserSupabase(): SupabaseClient | null {
  if (client === undefined) {
    const config = getSupabaseConfig();
    client = config ? createBrowserClient(config.url, config.key) : null;
  }
  return client;
}
