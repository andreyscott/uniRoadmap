import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Temporary home page so the app shell can be checked end to end.
 * The real landing page (search, featured roadmaps) is built in the "landing" step.
 */
export default function HomePage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight sm:text-6xl">
        Pick the right course. Then know what to learn, year by year.
      </h1>
      <p className="mt-5 max-w-xl text-lg text-muted-foreground">
        Uniroadmap maps each degree from Year 1 to final year: core modules, electives,
        skills and free resources for every stop along the way.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild className="h-11 px-5 text-base">
          <Link href="/quiz">Find my course</Link>
        </Button>
        <Button asChild variant="outline" className="h-11 px-5 text-base">
          <Link href="/courses">Browse courses</Link>
        </Button>
      </div>
    </section>
  );
}
