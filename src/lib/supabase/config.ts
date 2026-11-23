/**
 * Supabase project settings. Both values are public by design (the publishable key only
 * allows what row-level security permits, and every table here blocks the Data API).
 * Returns null when they're missing, so the content pages still work without Supabase.
 *
 * The env vars are referenced literally so Next.js can inline them into browser code.
 */
export function getSupabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

/**
 * A safe place to send someone after signing in: a path on this site, never another origin.
 * "//evil.com" and "/\evil.com" are protocol-relative URLs to other sites, so they're rejected.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
