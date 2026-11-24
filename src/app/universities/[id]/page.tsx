import { Suspense, type CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { MyUniversityButton } from "@/components/universities/my-university-button";
import { OWNERSHIP_LABELS } from "@/lib/content/constants";
import { getCourse, getFaculty } from "@/lib/content/load";
import { siteConfig } from "@/lib/site";
import { getUniversityPublic } from "@/lib/universities/queries";

export async function generateMetadata({ params }: PageProps<"/universities/[id]">): Promise<Metadata> {
  const { id } = await params;
  const uni = await getUniversityPublic(id);
  if (!uni) return {};
  return {
    title: `${uni.shortName} course roadmaps`,
    description: `Course roadmaps for ${uni.name} (${uni.shortName}): each course's modules, semesters and credit units, year by year.`,
    alternates: { canonical: `/universities/${uni.id}` },
  };
}

// The id comes from the URL and the data from the database, so this renders per request
// (from cache) behind Suspense; admin edits expire the cache.
export default function UniversityPage({ params }: PageProps<"/universities/[id]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-20 sm:px-6 sm:pt-10">
      <Suspense fallback={<PageSkeleton />}>
        <UniversityContent params={params} />
      </Suspense>
    </div>
  );
}

async function UniversityContent({ params }: Pick<PageProps<"/universities/[id]">, "params">) {
  const { id } = await params;
  const uni = await getUniversityPublic(id);
  if (!uni) notFound();

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollegeOrUniversity",
          name: uni.name,
          alternateName: uni.shortName,
          url: uni.website ?? `${siteConfig.url}/universities/${uni.id}`,
          address: { "@type": "PostalAddress", addressLocality: uni.city, addressRegion: uni.state, addressCountry: "NG" },
        }}
      />
      <Breadcrumbs items={[{ href: "/universities", label: "Universities" }]} current={uni.shortName} currentHref={`/universities/${uni.id}`} />

      <header className="mt-6">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">{uni.name}</h1>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-lg text-muted-foreground">
          <span className="font-medium text-foreground">{uni.shortName}</span>
          <span>
            {uni.city}, {uni.state}
          </span>
          <span>{OWNERSHIP_LABELS[uni.ownership]} university</span>
          {uni.website && (
            <a href={uni.website} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">
              Official website<span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </p>
        {uni.description && <p className="mt-4 max-w-prose">{uni.description}</p>}
        <div className="mt-5">
          <MyUniversityButton universityId={uni.id} shortName={uni.shortName} />
        </div>
      </header>

      <section aria-labelledby="courses-heading" className="mt-12">
        <h2 id="courses-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
          Courses at {uni.shortName}
        </h2>
        {uni.courses.length === 0 ? (
          <p className="mt-4 max-w-prose rounded-xl border border-dashed p-6 text-muted-foreground">
            No {uni.shortName} course versions have been added yet. Meanwhile, the{" "}
            <Link href="/courses" className="font-medium text-primary underline underline-offset-4">
              general course roadmaps
            </Link>{" "}
            cover what most universities teach.
          </p>
        ) : (
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {uni.courses.map((uc) => {
              const course = getCourse(uc.courseId);
              if (!course) return null;
              const color = getFaculty(course.faculty)?.color ?? "engineering";
              return (
                <li
                  key={uc.courseId}
                  style={{ "--line": `var(--line-${color})` } as CSSProperties}
                  className="group relative rounded-xl border bg-card p-4 hover:border-(--line) has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring"
                >
                  <h3 className="flex items-center gap-2.5 text-lg font-bold">
                    <span aria-hidden className="h-2.5 w-6 shrink-0 rounded-full bg-(--line)" />
                    <Link
                      href={`/universities/${uni.id}/${uc.courseId}`}
                      className="underline-offset-4 group-hover:underline after:absolute after:inset-0 focus-visible:outline-none"
                    >
                      {course.name}
                    </Link>
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[uc.department, uc._count.modules ? `${uc._count.modules} modules` : "Curriculum coming soon"]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="mt-12 max-w-prose text-sm text-muted-foreground">
        {uni.shortName} details are kept up to date by Uniroadmap editors. Always confirm admission requirements on the
        university&apos;s official channels.
      </p>
    </>
  );
}

function PageSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading</span>
      <div aria-hidden className="animate-pulse">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="mt-6 h-12 w-2/3 max-w-xl rounded-lg bg-muted" />
        <div className="mt-4 h-5 w-80 rounded bg-muted" />
        <div className="mt-12 grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
