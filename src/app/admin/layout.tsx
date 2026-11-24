import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";
import { getStaffContext } from "@/lib/admin/access";
import { getSessionUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin | Uniroadmap" },
  robots: { index: false, follow: false },
};

// Admin pages are per-user and behind sign-in, so navigations into them may wait for the server.
export const instant = false;

/**
 * The admin area. Everything reads the session, so it renders per request behind Suspense.
 * This frame only decides what to show; each page and action checks access again itself.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-20 sm:px-6">
      <Suspense fallback={<AdminLoading />}>
        <AdminFrame>{children}</AdminFrame>
      </Suspense>
    </div>
  );
}

async function AdminFrame({ children }: { children: React.ReactNode }) {
  const [user, ctx] = await Promise.all([getSessionUser(), getStaffContext()]);

  // Pages still render below the gate (they show nothing without access), so Next.js can
  // validate every segment instead of reporting it as dropped.
  if (!user) {
    return (
      <>
        <Gate title="Sign in to use the admin area">
          <Button asChild className="mt-5 h-11 px-5 text-base">
            <Link href="/login?next=%2Fadmin">Sign in</Link>
          </Button>
        </Gate>
        {children}
      </>
    );
  }
  if (!ctx) {
    return (
      <>
        <Gate title="Your account can't edit universities">
          <p className="mt-2 text-muted-foreground">
            You&apos;re signed in as {user.email ?? "this account"}. Ask an admin to give you access to your university.
          </p>
        </Gate>
        {children}
      </>
    );
  }

  const who = ctx.isAdmin ? `${user.email ?? "You"}, admin` : `${user.email ?? "You"}, editor`;
  return (
    <>
      <AdminNav isAdmin={ctx.isAdmin} who={who} />
      <div className="pt-6">{children}</div>
    </>
  );
}

function Gate({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 max-w-2xl rounded-xl border border-dashed p-6 sm:p-8">
      <h1 className="font-heading text-2xl font-bold">{title}</h1>
      {children}
    </div>
  );
}

function AdminLoading() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading</span>
      <div aria-hidden className="animate-pulse">
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="mt-8 h-10 w-80 rounded-lg bg-muted" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
