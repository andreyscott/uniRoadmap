import { Suspense, type CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { RoadmapPageSkeleton } from "@/components/roadmap/roadmap-page-skeleton";
import { RoadmapViewer } from "@/components/roadmap/roadmap-viewer";
import { YearStrip } from "@/components/year-strip";
import { DIFFICULTY_LABELS, EXAMS } from "@/lib/content/constants";
import { getCourse, getCourses, getFaculty } from "@/lib/content/load";
import { siteConfig } from "@/lib/site";

// Every course page is built from content files at build time.
export const ensureStatic = "navigation";

export function generateStaticParams() {
  return getCourses().map((course) => ({ id: course.id }));
}

export async function generateMetadata({ params }: PageProps<"/courses/[id]">): Promise<Metadata> {
  const { id } = await params;
  const course = getCourse(id);
  if (!course) return {};
  const title = course.roadmap ? `${course.name} roadmap` : course.name;
  return {
    title,
    description: course.summary,
    alternates: { canonical: `/courses/${course.id}` },
    openGraph: { title, description: course.summary, url: `/courses/${course.id}` },
  };
}

const SECTIONS = [
  { id: "roadmap", label: "Roadmap" },
  { id: "about", label: "About the course" },
  { id: "careers", label: "Careers" },
  { id: "entry", label: "Entry requirements" },
] as const;

/**
 * With Partial Prefetching, links prefetch one App Shell shared by every course, so anything
 * that depends on the URL's id sits behind Suspense. Direct visits still get the complete
 * prerendered page; client navigations show the skeleton until the course arrives.
 */
export default function CoursePage({ params }: PageProps<"/courses/[id]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-20 sm:px-6 sm:pt-10">
      <Suspense fallback={<RoadmapPageSkeleton />}>
        <CourseContent params={params} />
      </Suspense>
    </div>
  );
}

async function CourseContent({ params }: Pick<PageProps<"/courses/[id]">, "params">) {
  const { id } = await params;
  const course = getCourse(id);
  if (!course) notFound();
  // The loader has already checked that every course's faculty exists.
  const faculty = getFaculty(course.faculty)!;

  return (
    <div style={{ "--line": `var(--line-${faculty.color})` } as CSSProperties}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Course",
          name: course.name,
          description: course.summary,
          url: `${siteConfig.url}/courses/${course.id}`,
          educationalLevel: "Undergraduate",
          timeRequired: `P${course.durationYears}Y`,
          ...(course.roadmap && { teaches: course.roadmap.nodes.map((n) => n.title) }),
        }}
      />
      <Breadcrumbs items={[{ href: "/courses", label: "Courses" }]} current={course.name} currentHref={`/courses/${course.id}`} />

      <header className="mt-6">
        <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
          <span aria-hidden className="h-3 w-8 shrink-0 rounded-full bg-(--line) sm:h-4 sm:w-10" />
          {course.name}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{course.summary}</p>

        <dl className="mt-6 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-4 text-sm sm:flex sm:flex-wrap sm:gap-x-10">
          <Fact label="Faculty">{faculty.name}</Fact>
          <Fact label="Length">
            <span className="flex items-center gap-2">
              <YearStrip years={course.durationYears} />
              {course.durationYears} years
            </span>
          </Fact>
          <Fact label="Difficulty">{DIFFICULTY_LABELS[course.difficulty]}</Fact>
          <Fact label="Roadmap">{course.roadmap ? `${course.roadmap.nodes.length} topics` : "Coming soon"}</Fact>
        </dl>

        <nav aria-label="On this page" className="mt-8 border-y py-3">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="rounded-sm text-primary underline-offset-4 hover:underline">
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <section id="roadmap" aria-labelledby="roadmap-heading" className="mt-10 scroll-mt-24">
        <h2 id="roadmap-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
          Roadmap
        </h2>
        {course.roadmap ? (
          <div className="mt-4">
            <RoadmapViewer roadmapId={course.id} roadmap={course.roadmap} color={faculty.color} terminus="Graduation" />
          </div>
        ) : (
          <p className="mt-4 max-w-prose rounded-xl border border-dashed p-6 text-muted-foreground">
            We&apos;re still writing the year-by-year roadmap for this course. The overview, careers and
            entry requirements below are ready now.
          </p>
        )}
      </section>

      <div className="mt-16 grid gap-16 lg:max-w-3xl">
        <section id="about" aria-labelledby="about-heading" className="scroll-mt-24">
          <h2 id="about-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
            About the course
          </h2>
          <div className="mt-4 max-w-prose space-y-4">
            {course.overview.split(/\n\s*\n/).map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
          {course.durationNotes && (
            <>
              <h3 className="mt-8 text-lg font-bold">How long it takes</h3>
              <p className="mt-2 max-w-prose">{course.durationNotes}</p>
            </>
          )}
        </section>

        <section id="careers" aria-labelledby="careers-heading" className="scroll-mt-24">
          <h2 id="careers-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
            Careers
          </h2>
          <ul className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {course.careers.map((career) => (
              <li key={career.title} className="border-l-4 border-(--line) pl-4">
                <h3 className="font-bold">{career.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{career.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="entry" aria-labelledby="entry-heading" className="scroll-mt-24">
          <h2 id="entry-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
            Entry requirements
          </h2>
          <p className="mt-3 max-w-prose text-muted-foreground">
            Typical requirements. Universities set their own, so check the official page of each one
            you apply to.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {course.entryRequirements.map((req) => (
              <article key={req.exam} className="rounded-xl border bg-card p-5">
                <h3 className="font-bold">{EXAMS[req.exam].label}</h3>
                <p className="text-sm text-muted-foreground">{EXAMS[req.exam].region}</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm marker:text-(--line)">
                  {req.subjects.map((subject) => (
                    <li key={subject}>{subject}</li>
                  ))}
                </ul>
                {req.notes && <p className="mt-3 text-sm text-muted-foreground">{req.notes}</p>}
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}
