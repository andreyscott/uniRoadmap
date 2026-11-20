import Link from "next/link";
import { RouteLine } from "@/components/route-line";
import { getSkillRoadmaps } from "@/lib/content/load";
import { roadmapStops } from "@/lib/content/views";
import { SectionHeading } from "./section-heading";

/** The non-degree skill roadmaps, each drawn as a short line through its steps. */
export function FeaturedSkills() {
  const skills = getSkillRoadmaps();

  return (
    <section aria-labelledby="skills-heading" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <SectionHeading id="skills-heading" title="Skills for any course" href="/skills" linkLabel="All skill roadmaps">
        Short roadmaps for things every student has to work out, whatever they study.
      </SectionHeading>

      <ul className="mt-6 grid gap-1 sm:grid-cols-2 sm:gap-x-10">
        {skills.map((skill) => (
          <li
            key={skill.id}
            className="group relative -mx-3 rounded-xl px-3 py-5 hover:bg-muted/70 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring"
          >
            <h3 className="flex items-center gap-2.5 text-lg font-bold">
              <span aria-hidden className="h-2.5 w-6 shrink-0 rounded-full bg-line-skills" />
              <Link
                href={`/skills/${skill.id}`}
                className="underline-offset-4 group-hover:underline after:absolute after:inset-0 focus-visible:outline-none"
              >
                {skill.title}
              </Link>
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{skill.summary}</p>
            <RouteLine
              className="mt-4"
              stops={roadmapStops(skill.roadmap)}
              color="skills"
              label={`${skill.title}, step by step`}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
