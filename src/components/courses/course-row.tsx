import type { CSSProperties } from "react";
import Link from "next/link";
import { DIFFICULTY_LABELS, EXAMS, type ExamId } from "@/lib/content/constants";
import type { CourseListing } from "@/lib/content/directory";
import { YearStrip } from "@/components/year-strip";

interface CourseRowProps {
  listing: CourseListing;
  /** When set, the row shows this exam's entry subjects. */
  exam: ExamId | null;
  /** When set, this career is listed first. */
  career: string | null;
  /** When set, links to this university's version of the course. */
  university?: { id: string; shortName: string } | null;
}

const CAREERS_SHOWN = 3;

/** One course in the directory. The whole row is a link to the course page. */
export function CourseRow({ listing, exam, career, university }: CourseRowProps) {
  const careers = career
    ? [...listing.careers].sort((a, b) => Number(b.id === career) - Number(a.id === career))
    : listing.careers;
  const moreCareers = careers.length - CAREERS_SHOWN;
  const entry = exam ? listing.entry[exam] : undefined;

  return (
    <li
      style={{ "--line": `var(--line-${listing.faculty.color})` } as CSSProperties}
      className="group relative -mx-3 rounded-xl px-3 py-5 hover:bg-muted/70 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring"
    >
      <h3 className="flex items-center gap-2.5 text-xl font-bold">
        <span aria-hidden className="h-2.5 w-6 shrink-0 rounded-full bg-(--line)" />
        <Link
          href={`/courses/${listing.id}`}
          className="underline-offset-4 group-hover:underline after:absolute after:inset-0 focus-visible:outline-none"
        >
          {listing.name}
        </Link>
      </h3>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{listing.summary}</p>

      <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
        <div>
          <dt className="sr-only">Faculty</dt>
          <dd>{listing.faculty.name}</dd>
        </div>
        <div>
          <dt className="sr-only">Length</dt>
          <dd className="flex items-center gap-2">
            <YearStrip years={listing.durationYears} />
            {listing.durationYears} years
          </dd>
        </div>
        <div>
          <dt className="sr-only">Difficulty</dt>
          <dd>{DIFFICULTY_LABELS[listing.difficulty]}</dd>
        </div>
        <div>
          <dt className="sr-only">Roadmap</dt>
          <dd>{listing.topicCount ? `${listing.topicCount} topics` : "Roadmap coming soon"}</dd>
        </div>
      </dl>

      <p className="mt-2 max-w-2xl text-sm">
        <span className="font-medium">Careers:</span>{" "}
        {careers
          .slice(0, CAREERS_SHOWN)
          .map((c) => c.title)
          .join(", ")}
        {moreCareers > 0 && ` and ${moreCareers} more`}
      </p>
      {university && (
        <p className="mt-2 text-sm">
          {/* Above the row's stretched link so it stays clickable on its own. */}
          <Link
            href={`/universities/${university.id}/${listing.id}`}
            className="relative z-10 font-medium text-primary underline underline-offset-4 hover:no-underline"
          >
            {listing.name} at {university.shortName}
          </Link>
        </p>
      )}
      {exam && entry && (
        <p className="mt-1 max-w-2xl text-sm">
          {/* Subjects can contain commas ("One of: Chemistry, Biology"), so join with semicolons. */}
          <span className="font-medium">{EXAMS[exam].label}:</span> {entry.subjects.join("; ")}
        </p>
      )}
    </li>
  );
}
