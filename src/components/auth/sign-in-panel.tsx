"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendSignInLink, type SignInState } from "@/lib/auth/actions";
import { safeNextPath } from "@/lib/supabase/config";
import { signOut, useAuth } from "./auth-provider";

const IDLE: SignInState = { status: "idle" };

/** Email-link sign-in. Shows the right thing for every auth state. */
export function SignInPanel() {
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const linkFailed = params.get("error") === "link";
  const auth = useAuth();
  const [state, formAction, pending] = useActionState(sendSignInLink, IDLE);
  // "Use a different email" returns to the form without losing the action's last state.
  const [editing, setEditing] = useState(false);

  if (auth.status === "unavailable") {
    return (
      <p className="mt-6 max-w-prose rounded-xl border border-dashed p-6 text-muted-foreground">
        Sign-in isn&apos;t set up on this site yet. Everything else works without an account.
      </p>
    );
  }

  if (auth.status === "signed-in") {
    return (
      <div className="mt-6 max-w-prose">
        <p>
          You&apos;re signed in as <strong className="font-medium">{auth.user.email ?? "your account"}</strong>.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild className="h-11 px-5 text-base">
            <Link href={next === "/" ? "/dashboard" : next}>Continue</Link>
          </Button>
          <Button type="button" variant="outline" className="h-11 px-5 text-base" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  if (state.status === "sent" && !editing) {
    return (
      <div role="status" className="mt-6 max-w-prose">
        <h2 className="text-xl font-bold">Check your email</h2>
        <p className="mt-2">
          We sent a sign-in link to <strong className="font-medium">{state.email}</strong>. Open it on this
          device to finish signing in. The link works once and expires after an hour.
        </p>
        <p className="mt-4 text-muted-foreground">
          Nothing there? Check your spam folder, or{" "}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-sm text-primary underline underline-offset-4 hover:no-underline"
          >
            use a different email
          </button>
          .
        </p>
      </div>
    );
  }

  const error = state.status === "error" ? state.message : null;

  return (
    <form action={formAction} onSubmit={() => setEditing(false)} className="mt-6 max-w-md">
      {linkFailed && (
        <p role="alert" className="mb-5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          That sign-in link didn&apos;t work. It may have expired or already been used. Request a new one below.
        </p>
      )}
      <input type="hidden" name="next" value={next} />
      <label htmlFor="email" className="font-medium">
        Email address
      </label>
      <Input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.status === "idle" ? "" : state.email}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "email-error" : undefined}
        className="mt-1.5 h-12 bg-card text-base md:text-base"
      />
      {error && (
        <p id="email-error" role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="mt-4 h-11 w-full px-5 text-base sm:w-auto">
        {pending ? "Sending…" : "Email me a sign-in link"}
      </Button>
      <p className="mt-4 text-sm text-muted-foreground">
        No password needed. If you&apos;re new here, this creates your account.
      </p>
    </form>
  );
}
