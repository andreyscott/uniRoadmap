"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  filtersToQuery,
  parseFilters,
  type CourseListing,
  type DirectoryFilters,
  type DirectoryOptions,
} from "@/lib/content/directory";
import { DirectoryView } from "./directory-view";

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
  const filters = useMemo(() => parseFilters(searchParams, options), [searchParams, options]);

  const onChange = useCallback((next: DirectoryFilters) => {
    const query = filtersToQuery(next);
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, []);

  return <DirectoryView listings={listings} options={options} filters={filters} onChange={onChange} />;
}
