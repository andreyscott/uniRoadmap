"use client";

import { Button } from "@/components/ui/button";

/** Shown when admin data can't load, most often because the database migration hasn't run. */
export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mt-6 max-w-2xl rounded-xl border border-dashed p-6 sm:p-8">
      <h1 className="font-heading text-2xl font-bold">The admin area couldn&apos;t load</h1>
      <p className="mt-2 text-muted-foreground">
        The database didn&apos;t respond as expected. If this is a new deployment, run{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm">npm run db:migrate</code> and{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm">npm run db:seed</code>, then try again.
      </p>
      <Button type="button" variant="outline" className="mt-5 h-10 px-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
