"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/** University pages read the database; this shows when it's unreachable. */
export default function UniversitiesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 pb-20 sm:px-6">
      <div className="rounded-xl border border-dashed p-6 sm:p-8">
        <h1 className="font-heading text-2xl font-bold">University details couldn&apos;t load</h1>
        <p className="mt-2 text-muted-foreground">
          Something went wrong on our side. Try again in a moment, or browse the{" "}
          <Link href="/courses" className="font-medium text-primary underline underline-offset-4">
            general course roadmaps
          </Link>{" "}
          meanwhile.
        </p>
        <Button type="button" variant="outline" className="mt-5 h-10 px-4" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
