import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/supabase/config";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Sign-in link target with Supabase's default email template. Supabase verifies the link,
 * then redirects here with a one-time `code`, exchanged for a session using the verifier
 * cookie set when the link was requested. That cookie only exists in the browser that asked
 * for the link; /auth/confirm covers the other cases (see README).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  const supabase = await createServerSupabase();
  if (supabase && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  return NextResponse.redirect(new URL(`/login?error=link&next=${encodeURIComponent(next)}`, origin));
}
