import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/supabase/config";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Sign-in link target when the Supabase email template links here with a token hash:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}
 * Unlike /auth/callback, this works even if the link opens in a different browser (for
 * example an email app's built-in browser), because it doesn't need a cookie set at sign-in.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(nextFrom(searchParams.get("next"), origin), "/dashboard");

  const supabase = await createServerSupabase();
  if (supabase && tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  return NextResponse.redirect(new URL(`/login?error=link&next=${encodeURIComponent(next)}`, origin));
}

/**
 * `{{ .RedirectTo }}` is the full emailRedirectTo URL (…/auth/callback?next=/courses/x), so
 * pull the inner `next` path back out of it. A plain path is used as is.
 */
function nextFrom(value: string | null, origin: string): string | null {
  if (!value) return null;
  if (value.startsWith("/")) return value;
  try {
    const url = new URL(value);
    return url.origin === origin ? (url.searchParams.get("next") ?? url.pathname) : null;
  } catch {
    return null;
  }
}
