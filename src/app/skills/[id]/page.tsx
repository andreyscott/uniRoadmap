import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { RoadmapPageSkeleton } from "@/components/roadmap/roadmap-page-skeleton";
import { RoadmapViewer } from "@/components/roadmap/roadmap-viewer";
import { getSkillRoadmap, getSkillRoadmaps } from "@/lib/content/load";

export const ensureStatic = "navigation";

export function generateStaticParams() {
  return getSkillRoadmaps().map((skill) => ({ id: skill.id }));
}

export async function generateMetadata({ params }: PageProps<"/skills/[id]">): Promise<Metadata> {
  const { id } = await params;
  const skill = getSkillRoadmap(id);
  if (!skill) return {};
  const title = `${skill.title} roadmap`;
  return {
    title,
    description: skill.summary,
    alternates: { canonical: `/skills/${skill.id}` },
    openGraph: { title, description: skill.summary, url: `/skills/${skill.id}` },
  };
}

// URL-dependent content sits behind Suspense so the shared App Shell stays instant
// (same pattern as the course page).
export default function SkillPage({ params }: PageProps<"/skills/[id]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-20 sm:px-6 sm:pt-10">
      <Suspense fallback={<RoadmapPageSkeleton />}>
        <SkillContent params={params} />
      </Suspense>
    </div>
  );
}

async function SkillContent({ params }: Pick<PageProps<"/skills/[id]">, "params">) {
  const { id } = await params;
  const skill = getSkillRoadmap(id);
  if (!skill) notFound();

  return (
    <div>
      <Breadcrumbs
        items={[{ href: "/skills", label: "Skill roadmaps" }]}
        current={skill.title}
        currentHref={`/skills/${skill.id}`}
      />

      <header className="mt-6">
        <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
          <span aria-hidden className="h-3 w-8 shrink-0 rounded-full bg-line-skills sm:h-4 sm:w-10" />
          {skill.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{skill.summary}</p>
        <div className="mt-4 max-w-prose space-y-4">
          {skill.description.split(/\n\s*\n/).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </header>

      <section aria-labelledby="roadmap-heading" className="mt-12">
        <h2 id="roadmap-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
          Roadmap
        </h2>
        <div className="mt-4">
          <RoadmapViewer progressSource={{ kind: "roadmap", id: skill.id }} roadmap={skill.roadmap} color="skills" terminus="Finish line" />
        </div>
      </section>
    </div>
  );
}
