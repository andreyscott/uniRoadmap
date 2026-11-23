import { Suspense } from "react";
import type { Metadata } from "next";
import { SignInPanel } from "@/components/auth/sign-in-panel";

export const ensureStatic = "navigation";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Uniroadmap to save your progress through each roadmap.",
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Sign in</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        Save your progress on every roadmap and pick up where you left off on any device.
      </p>
      {/* The panel reads ?next= and ?error= from the URL, so it renders in the browser. */}
      <Suspense fallback={<div className="mt-6 h-40" aria-hidden />}>
        <SignInPanel />
      </Suspense>
    </div>
  );
}
