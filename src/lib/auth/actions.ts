"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { siteConfig } from "@/lib/site";
import { safeNextPath } from "@/lib/supabase/config";
import { createServerSupabase } from "@/lib/supabase/server";

export type SignInState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string; email: string };

const emailSchema = z.email();

/**
 * Emails a one-time sign-in link (Supabase magic link). New emails get an account
 * automatically, so there's no separate sign-up step and no password to forget.
 */
export async function sendSignInLink(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const next = safeNextPath(String(formData.get("next") ?? ""));

  if (!emailSchema.safeParse(email).success) {
    return { status: "error", message: "Enter a valid email address, like name@example.com.", email };
  }

  const supabase = await createServerSupabase();
  if (!supabase) {
    return { status: "error", message: "Sign-in isn't set up on this site yet.", email };
  }

  // Build the link from the address the request came from, so previews and localhost work.
  // Supabase only follows it if the URL is in the project's allowed redirect list.
  const origin = (await headers()).get("origin") ?? siteConfig.url;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });

  if (error) {
    console.error("[auth] signInWithOtp failed:", error.status, error.code, error.message);
    const message =
      error.status === 429
        ? "Too many sign-in emails were sent. Wait a few minutes, then try again."
        : "We couldn't send the email. Check the address and try again.";
    return { status: "error", message, email };
  }
  return { status: "sent", email };
}
