import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { UniversityFinder } from "@/components/universities/university-finder";
import { getUniversityList } from "@/lib/universities/queries";

export const metadata: Metadata = {
  title: "Universities",
  description:
    "Find your university to see its version of each course: the real course codes, semesters and credit units, year by year.",
  alternates: { canonical: "/universities" },
};

export default function UniversitiesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Universities</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        Find your university to see how each course runs there: its own course codes, semesters and credit units,
        year by year.
      </p>
      <Suspense fallback={<ListSkeleton />}>
        <Directory />
      </Suspense>
    </div>
  );
}

async function Directory() {
  // University data is edited at runtime, so read it per request (from cache), never at build.
  await connection();
  return <UniversityFinder universities={await getUniversityList()} />;
}

function ListSkeleton() {
  return (
    <div aria-busy="true" className="mt-8">
      <span className="sr-only">Loading universities</span>
      <div aria-hidden className="grid animate-pulse gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="h-32 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
