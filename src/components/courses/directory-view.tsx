"use client";

import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { SearchIcon, SlidersHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  EXAMS,
  type ExamId,
} from "@/lib/content/constants";
import {
  EMPTY_FILTERS,
  countActiveFilters,
  filterCourses,
  type CourseListing,
  type DirectoryFilters,
  type DirectoryOptions,
} from "@/lib/content/directory";
import { cn } from "@/lib/utils";
import { CourseRow } from "./course-row";

interface DirectoryViewProps {
  listings: CourseListing[];
  options: DirectoryOptions;
  filters: DirectoryFilters;
  /**
   * Called with the next filters. Missing in the prerendered fallback (before the URL is
   * known), where the controls render disabled so the layout doesn't jump on hydration.
   */
  onChange?: (filters: DirectoryFilters) => void;
}

const toggle = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

export function DirectoryView({ listings, options, filters, onChange }: DirectoryViewProps) {
  const disabled = !onChange;
  const panelId = useId();
  const [panelOpen, setPanelOpen] = useState(false);
  const resultsRef = useRef<HTMLElement>(null);

  // The search box keeps its own state so typing never waits for the URL to update.
  // When the URL's query changes from elsewhere (Clear all, back button), adopt it.
  const [query, setQuery] = useState(filters.q);
  const [urlQuery, setUrlQuery] = useState(filters.q);
  if (filters.q !== urlQuery) {
    setUrlQuery(filters.q);
    if (filters.q !== query.trim()) setQuery(filters.q);
  }

  const results = useMemo(
    () => filterCourses(listings, { ...filters, q: query.trim() }),
    [listings, filters, query],
  );
  const activeCount = countActiveFilters(filters);
  const canClear = activeCount > 0 || query.trim() !== "";

  const update = (patch: Partial<DirectoryFilters>) => onChange?.({ ...filters, q: query, ...patch });
  const clearAll = () => {
    setQuery("");
    onChange?.(EMPTY_FILTERS);
  };

  const examSubjects = filters.exam ? (options.subjectsByExam[filters.exam] ?? []) : [];
  // Grouped for <optgroup>. (Object.groupBy would do this, but older phone browsers lack it.)
  const examsByRegion = new Map<string, ExamId[]>();
  for (const exam of Object.keys(options.subjectsByExam) as ExamId[]) {
    const region = EXAMS[exam].region;
    examsByRegion.set(region, [...(examsByRegion.get(region) ?? []), exam]);
  }

  return (
    <div className="mt-8 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
      <form role="search" aria-label="Courses" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="directory-search" className="sr-only">
          Search courses
        </label>
        <div className="relative">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="directory-search"
            type="search"
            name="q"
            value={query}
            disabled={disabled}
            onChange={(e) => {
              setQuery(e.target.value);
              update({ q: e.target.value });
            }}
            placeholder="Course, career or topic"
            enterKeyHint="search"
            autoComplete="off"
            className="h-11 bg-card pl-11 text-base md:text-base"
          />
        </div>

        <div className="mt-4 flex min-h-9 items-center justify-between gap-3">
          <h2 className="hidden font-heading text-lg font-bold lg:block">Filters</h2>
          <Button
            type="button"
            variant="outline"
            className="h-9 gap-2 px-3 lg:hidden"
            aria-expanded={panelOpen}
            aria-controls={panelId}
            disabled={disabled}
            onClick={() => setPanelOpen((open) => !open)}
          >
            <SlidersHorizontalIcon aria-hidden />
            Filters
            {activeCount > 0 && (
              <>
                <span
                  aria-hidden
                  className="rounded-full bg-primary px-1.5 text-xs leading-5 text-primary-foreground tabular-nums"
                >
                  {activeCount}
                </span>
                <span className="sr-only">({activeCount} active)</span>
              </>
            )}
          </Button>
          {canClear && (
            <button
              type="button"
              onClick={clearAll}
              className="rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        <div id={panelId} className={cn("mt-4 space-y-7", panelOpen ? "block" : "hidden", "lg:block")}>
          <FilterGroup legend="Faculty">
            {options.faculties.map((faculty) => (
              <Checkbox
                key={faculty.id}
                name="faculty"
                value={faculty.id}
                checked={filters.faculties.includes(faculty.id)}
                disabled={disabled}
                onChange={() => update({ faculties: toggle(filters.faculties, faculty.id) })}
              >
                <span
                  aria-hidden
                  className="h-2 w-4 shrink-0 rounded-full"
                  style={{ background: `var(--line-${faculty.color})` }}
                />
                {faculty.name}
              </Checkbox>
            ))}
          </FilterGroup>

          <FilterGroup legend="Difficulty">
            {DIFFICULTIES.map((difficulty) => (
              <Checkbox
                key={difficulty}
                name="difficulty"
                value={difficulty}
                checked={filters.difficulties.includes(difficulty)}
                disabled={disabled}
                onChange={() => update({ difficulties: toggle(filters.difficulties, difficulty) })}
              >
                {DIFFICULTY_LABELS[difficulty]}
              </Checkbox>
            ))}
          </FilterGroup>

          <div>
            <label htmlFor="directory-career" className="font-heading text-sm font-bold">
              Career
            </label>
            <Select
              id="directory-career"
              name="career"
              value={filters.career ?? ""}
              disabled={disabled}
              onChange={(e) => update({ career: e.target.value || null })}
            >
              <option value="">Any career</option>
              {options.careers.map((career) => (
                <option key={career.id} value={career.id}>
                  {career.title}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="directory-exam" className="font-heading text-sm font-bold">
              Entry exam
            </label>
            <Select
              id="directory-exam"
              name="exam"
              value={filters.exam ?? ""}
              disabled={disabled}
              onChange={(e) => update({ exam: (e.target.value || null) as ExamId | null, subjects: [] })}
            >
              <option value="">Any exam</option>
              {[...examsByRegion].map(([region, exams]) => (
                <optgroup key={region} label={region}>
                  {exams.map((exam) => (
                    <option key={exam} value={exam}>
                      {EXAMS[exam].label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>

            {filters.exam && (
              <FilterGroup legend="Your subjects" className="mt-4">
                {examSubjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No course needs specific subjects for this exam.</p>
                ) : (
                  <>
                    <p className="mb-1 text-sm text-muted-foreground">
                      Tick the subjects you&apos;re taking to see courses where you have every required one.
                      Some courses also need extra subjects from a list.
                    </p>
                    {examSubjects.map((subject) => (
                      <Checkbox
                        key={subject.id}
                        name="subject"
                        value={subject.id}
                        checked={filters.subjects.includes(subject.id)}
                        disabled={disabled}
                        onChange={() => update({ subjects: toggle(filters.subjects, subject.id) })}
                      >
                        {subject.label}
                      </Checkbox>
                    ))}
                  </>
                )}
              </FilterGroup>
            )}
          </div>

          {/* Phones only: the open panel pushes results far down, so offer a way back to them. */}
          <Button
            type="button"
            className="h-11 w-full text-base lg:hidden"
            onClick={() => {
              // Collapse first, so focusing scrolls to where the results end up, not where they were.
              flushSync(() => setPanelOpen(false));
              resultsRef.current?.focus();
            }}
          >
            {results.length === 1 ? "Show 1 course" : `Show ${results.length} courses`}
          </Button>
        </div>
      </form>

      <section
        ref={resultsRef}
        tabIndex={-1}
        aria-labelledby="results-heading"
        className="mt-8 scroll-mt-24 outline-none lg:mt-0"
      >
        <h2 id="results-heading" className="sr-only">
          Results
        </h2>
        <p role="status" className="text-sm text-muted-foreground lg:mt-3">
          {results.length === 1 ? "1 course" : `${results.length} courses`}
        </p>

        {results.length > 0 ? (
          <ul className="mt-2 grid gap-1">
            {results.map((listing) => (
              <CourseRow key={listing.id} listing={listing} exam={filters.exam} career={filters.career} />
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed p-6 sm:p-8">
            <p className="font-heading text-lg font-bold">
              {activeCount === 0 ? `No courses match “${query.trim()}”` : "No courses match all of these filters"}
            </p>
            <p className="mt-2 max-w-prose text-muted-foreground">
              Try removing a filter or searching for something broader. Not sure where to start?{" "}
              <Link href="/quiz" className="font-medium text-primary underline underline-offset-4">
                Take the course finder
              </Link>
              .
            </p>
            <Button type="button" variant="outline" className="mt-5 h-10 px-4" onClick={clearAll}>
              Clear all
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function FilterGroup({
  legend,
  className,
  children,
}: {
  legend: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className={className}>
      <legend className="mb-1.5 font-heading text-sm font-bold">{legend}</legend>
      <div className="grid gap-0.5">{children}</div>
    </fieldset>
  );
}

function Checkbox({
  children,
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & { children: ReactNode }) {
  return (
    // py-1 keeps each option at least 24px tall (WCAG 2.2 target size).
    <label className="flex items-center gap-2.5 py-1 text-sm has-disabled:opacity-70">
      <input type="checkbox" className="size-4 shrink-0 accent-primary" {...props} />
      {children}
    </label>
  );
}

function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "mt-1.5 h-10 w-full rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-70 dark:bg-input/30",
        className,
      )}
      {...props}
    />
  );
}
