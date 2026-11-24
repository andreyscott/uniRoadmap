"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  filtersToQuery,
  parseFilters,
  type CourseListing,
  type DirectoryFilters,
  type DirectoryOptions,
} from "@/lib/content/directory";
import { DirectoryView, type UniversityOption } from "./directory-view";

interface CourseDirectoryProps {
  listings: CourseListing[];
  options: DirectoryOptions;
}

/**
 * The interactive directory. Filters live in the URL so a filtered view can be shared.
 *
 * Reading useSearchParams makes this render in the browser (the page wraps it in Suspense,
 * with the unfiltered list as the prerendered fallback). Changes go through
 * history.replaceState, which Next.js syncs with useSearchParams without a server request.
 */
export function CourseDirectory({ listings, options }: CourseDirectoryProps) {
  const searchParams = useSearchParams();

  // University data changes at runtime, so it loads separately from the prerendered course list.
  const [universities, setUniversities] = useState<UniversityOption[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/universities")
      .then((res) => (res.ok ? (res.json() as Promise<UniversityOption[]>) : null))
      .then((data) => !cancelled && setUniversities(data))
      .catch(() => {
        // The university filter just stays hidden.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const filters = useMemo(() => parseFilters(searchParams, options), [searchParams, options]);

  const onChange = useCallback((next: DirectoryFilters) => {
    const query = filtersToQuery(next);
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, []);

  return (
    <DirectoryView listings={listings} options={options} filters={filters} onChange={onChange} universities={universities} />
  );
}
