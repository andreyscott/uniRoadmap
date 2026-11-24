/**
 * Stops the app from starting or building when a Supabase secret key is in a NEXT_PUBLIC_
 * variable. Next.js copies every NEXT_PUBLIC_ value into the JavaScript sent to browsers, and a
 * secret key bypasses row-level security, so one there would hand anyone full database access.
 *
 * Runs from next.config.ts (before `next dev` and `next build`). Kept free of Next.js imports so
 * it can be tested directly.
 */

/** True for Supabase keys that must stay on the server. */
export function isSupabaseSecretKey(raw: string): boolean {
  const value = raw.trim().replace(/^["']|["']$/g, "");
  if (value.startsWith("sb_secret_")) return true;

  // Legacy keys are JWTs; the secret one says "role": "service_role" in its payload.
  const parts = value.split(".");
  if (parts.length !== 3 || !parts[0].startsWith("eyJ")) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { role?: unknown };
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

/** Names of NEXT_PUBLIC_ variables holding a Supabase secret key (never their values). */
export function findExposedSecrets(env: Record<string, string | undefined>): string[] {
  return Object.entries(env)
    .filter(([name, value]) => name.startsWith("NEXT_PUBLIC_") && value !== undefined && isSupabaseSecretKey(value))
    .map(([name]) => name)
    .sort();
}

export function assertNoExposedSecrets(env: Record<string, string | undefined> = process.env): void {
  const names = findExposedSecrets(env);
  if (names.length === 0) return;
  throw new Error(
    [
      `${names.join(", ")} ${names.length === 1 ? "holds" : "hold"} a Supabase secret key.`,
      "Variables starting with NEXT_PUBLIC_ are sent to every browser, and a secret key bypasses",
      "row-level security. Put the publishable key (sb_publishable_...) there instead, from",
      "Supabase: Project Settings > API Keys. If the secret key was ever deployed or shared,",
      "create a new one in the same screen and delete the old one.",
    ].join("\n"),
  );
}
