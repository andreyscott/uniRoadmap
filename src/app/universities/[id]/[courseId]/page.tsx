import { Suspense, type CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { RoadmapPageSkeleton } from "@/components/roadmap/roadmap-page-skeleton";
import { RoadmapViewer } from "@/components/roadmap/roadmap-viewer";
import { YearStrip } from "@/components/year-strip";
import { getCourse, getFaculty } from "@/lib/content/load";
import { siteConfig } from "@/lib/site";
import { getUniversityCoursePublic } from "@/lib/universities/queries";
import { toViewerRoadmap } from "@/lib/universities/roadmap";

export async function generateMetadata({ params }: PageProps<"/universities/[id]/[courseId]">): Promise<Metadata> {
  const { id, courseId } = await params;
  const [uc, course] = [await getUniversityCoursePublic(id, courseId), getCourse(courseId)];
  if (!uc || !course) return {};
  const title = `${course.name} at ${uc.university.shortName}: roadmap`;
  return {
    title,
    description: `${course.name} at ${uc.university.name}: modules, semesters and credit units year by year, with free resources for each topic.`,
    alternates: { canonical: `/universities/${id}/${courseId}` },
  };
}

export default function UniversityCoursePage({ params }: PageProps<"/universities/[id]/[courseId]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-20 sm:px-6 sm:pt-10">
      <Suspense fallback={<RoadmapPageSkeleton />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

async function Content({ params }: Pick<PageProps<"/universities/[id]/[courseId]">, "params">) {
  const { id, courseId } = await params;
  const [uc, course] = [await getUniversityCoursePublic(id, courseId), getCourse(courseId)];
  if (!uc || !course) notFound();

  const uni = uc.university;
  const faculty = getFaculty(course.faculty)!;
  const years = uc.durationYears ?? course.durationYears;
  const units = uc.modules.reduce((sum, m) => sum + (m.creditUnits ?? 0), 0);
  const roadmap = toViewerRoadmap(uc.modules, years, course);

  return (
    <div style={{ "--line": `var(--line-${faculty.color})` } as CSSProperties}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Course",
          name: `${course.name} (${uni.shortName})`,
          description: course.summary,
          url: `${siteConfig.url}/universities/${id}/${courseId}`,
          provider: { "@type": "CollegeOrUniversity", name: uni.name, alternateName: uni.shortName },
          timeRequired: `P${years}Y`,
        }}
      />
      <Breadcrumbs
        items={[
          { href: "/universities", label: "Universities" },
          { href: `/universities/${id}`, label: uni.shortName },
        ]}
        current={course.name}
        currentHref={`/universities/${id}/${courseId}`}
      />

      <header className="mt-6">
        <h1 className="flex flex-wrap items-center gap-x-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
          <span aria-hidden className="h-3 w-8 shrink-0 rounded-full bg-(--line) sm:h-4 sm:w-10" />
          {course.name} <span className="text-muted-foreground">at {uni.shortName}</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          {[uc.department, uc.faculty, uni.name].filter(Boolean).join(", ")}
        </p>
        <dl className="mt-6 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-4 text-sm sm:flex sm:flex-wrap sm:gap-x-10">
          <Fact label="Length">
            <span className="flex items-center gap-2">
              <YearStrip years={years} />
              {years} years
            </span>
          </Fact>
          <Fact label="Modules">{uc.modules.length || "Coming soon"}</Fact>
          {units > 0 && <Fact label="Credit units">{units}</Fact>}
          <Fact label="General roadmap">
            <Link href={`/courses/${courseId}`} className="text-primary underline underline-offset-4">
              {course.name}
            </Link>
          </Fact>
        </dl>
      </header>

      <section aria-labelledby="roadmap-heading" className="mt-10">
        <h2 id="roadmap-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
          {uni.shortName} curriculum
        </h2>
        {uc.modules.length > 0 ? (
          <div className="mt-4">
            <RoadmapViewer
              progressSource={{ kind: "university-course", id: uc.id }}
              roadmap={roadmap}
              color={faculty.color}
              terminus="Graduation"
            />
          </div>
        ) : (
          <p className="mt-4 max-w-prose rounded-xl border border-dashed p-6 text-muted-foreground">
            {uni.shortName}&apos;s modules for this course haven&apos;t been added yet. The{" "}
            <Link href={`/courses/${courseId}`} className="font-medium text-primary underline underline-offset-4">
              general {course.name} roadmap
            </Link>{" "}
            covers what most universities teach.
          </p>
        )}
      </section>

      <section aria-labelledby="admission-heading" className="mt-16 max-w-3xl">
        <h2 id="admission-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
          Getting in at {uni.shortName}
        </h2>
        {uc.utmeSubjects.length > 0 && (
          <>
            <h3 className="mt-5 font-bold">UTME subject combination</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-(--line)">
              {uc.utmeSubjects.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </>
        )}
        {uc.admissionNotes && (
          <>
            <h3 className="mt-5 font-bold">Cut-off and screening</h3>
            <p className="mt-2 max-w-prose whitespace-pre-line">{uc.admissionNotes}</p>
          </>
        )}
        {uc.notes && <p className="mt-5 max-w-prose whitespace-pre-line">{uc.notes}</p>}
        {uc.utmeSubjects.length === 0 && !uc.admissionNotes && (
          <p className="mt-4 text-muted-foreground">
            {uni.shortName}&apos;s admission details haven&apos;t been added yet. See the{" "}
            <Link href={`/courses/${courseId}#entry`} className="font-medium text-primary underline underline-offset-4">
              typical entry requirements
            </Link>
            .
          </p>
        )}
        <p className="mt-8 text-sm text-muted-foreground">
          Last updated {UPDATED.format(uc.updatedAt)} by Uniroadmap editors. Always confirm admission
          requirements on {uni.shortName}&apos;s official channels.
        </p>
      </section>
    </div>
  );
}

// A date, not "3 days ago": the current time can't be read while this page prerenders.
const UPDATED = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Africa/Lagos" });

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}
