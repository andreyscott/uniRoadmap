"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { OWNERSHIP_LABELS, OWNERSHIPS, type Ownership } from "@/lib/content/constants";
import { normalise } from "@/lib/content/directory";
import type { UniversitySummary } from "@/lib/universities/queries";
import { cn } from "@/lib/utils";

/** Searchable list of universities, filtered by ownership. */
export function UniversityFinder({ universities }: { universities: UniversitySummary[] }) {
  const [query, setQuery] = useState("");
  const [ownership, setOwnership] = useState<Ownership | null>(null);

  const results = useMemo(() => {
    const words = normalise(query).split(/\s+/).filter(Boolean);
    return universities.filter((u) => {
      if (ownership && u.ownership !== ownership) return false;
      const text = normalise(`${u.name} ${u.shortName} ${u.city} ${u.state}`);
      return words.every((w) => text.includes(w));
    });
  }, [universities, query, ownership]);

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-md">
          <label htmlFor="university-search" className="sr-only">
            Search universities
          </label>
          <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="university-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, abbreviation or state"
            autoComplete="off"
            className="h-11 bg-card pl-11 text-base md:text-base"
          />
        </div>
        <div role="group" aria-label="Ownership" className="flex flex-wrap gap-1.5">
          {[null, ...OWNERSHIPS].map((o) => (
            <button
              key={o ?? "all"}
              type="button"
              aria-pressed={ownership === o}
              onClick={() => setOwnership(o)}
              className={cn(
                "h-9 rounded-full border px-3.5 text-sm font-medium",
                ownership === o ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
              )}
            >
              {o ? OWNERSHIP_LABELS[o] : "All"}
            </button>
          ))}
        </div>
      </div>

      <p role="status" className="mt-5 text-sm text-muted-foreground">
        {results.length === 1 ? "1 university" : `${results.length} universities`}
      </p>
      {results.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed p-6 text-muted-foreground">
          No universities match. Try a different spelling or the abbreviation, like UNILAG.
        </p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((u) => (
            <li
              key={u.id}
              className="group relative rounded-xl border bg-card p-4 hover:border-primary has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring"
            >
              <p className="font-heading text-xl font-bold">
                <Link
                  href={`/universities/${u.id}`}
                  className="underline-offset-4 group-hover:underline after:absolute after:inset-0 focus-visible:outline-none"
                >
                  {u.shortName}
                </Link>
              </p>
              <p>{u.name}</p>
              <p className="mt-2 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                <span>
                  {u.city}, {u.state}
                </span>
                <span>{OWNERSHIP_LABELS[u.ownership]}</span>
              </p>
              <p className="mt-2 text-sm">
                {u.courseIds.length === 0
                  ? "Courses coming soon"
                  : `${u.courseIds.length} ${u.courseIds.length === 1 ? "course" : "courses"} with a ${u.shortName} version`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
