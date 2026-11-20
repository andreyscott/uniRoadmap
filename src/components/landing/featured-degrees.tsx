import type { CSSProperties } from "react";
import Link from "next/link";
import { RouteLine } from "@/components/route-line";
import { getCourses, getFaculty } from "@/lib/content/load";
import { roadmapStops } from "@/lib/content/views";
import { SectionHeading } from "./section-heading";

/** Every degree that has a roadmap, drawn as transit lines that share year columns. */
export function FeaturedDegrees() {
  const degrees = getCourses().flatMap((course) => {
    // The loader has already checked that every course's faculty exists.
    const faculty = getFaculty(course.faculty)!;
    return course.roadmap ? [{ course, faculty, roadmap: course.roadmap }] : [];
  });
  const columns = Math.max(...degrees.map((d) => d.roadmap.stages.length));

  return (
    <section aria-labelledby="degrees-heading" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <SectionHeading id="degrees-heading" title="Degree roadmaps" href="/courses" linkLabel="All courses">
        Each line runs from first year to graduation. The stops show one core module from every
        year.
      </SectionHeading>

      <ul className="mt-6 grid gap-1">
        {degrees.map(({ course, faculty, roadmap }) => (
          <li
            key={course.id}
            style={{ "--line": `var(--line-${faculty.color})` } as CSSProperties}
            className="group relative -mx-3 rounded-xl px-3 py-6 hover:bg-muted/70 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10"
          >
            <div>
              <h3 className="flex items-center gap-2.5 text-xl font-bold">
                {/* Legend key: ties the name to the line colour. */}
                <span aria-hidden className="h-2.5 w-6 shrink-0 rounded-full bg-(--line)" />
                {/* The ::after overlay makes the whole row clickable; the row shows the focus ring. */}
                <Link
                  href={`/courses/${course.id}`}
                  className="underline-offset-4 group-hover:underline after:absolute after:inset-0 focus-visible:outline-none"
                >
                  {course.name}
                </Link>
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{course.summary}</p>
              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span>{faculty.name}</span>
                <span>
                  {course.durationYears} years, {roadmap.nodes.length} topics
                </span>
              </p>
            </div>

            <RouteLine
              className="mt-5 lg:mt-1.5"
              stops={roadmapStops(roadmap, { withTopics: true })}
              color={faculty.color}
              columns={columns}
              labels="from-sm"
              label={`${course.name}, year by year`}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
