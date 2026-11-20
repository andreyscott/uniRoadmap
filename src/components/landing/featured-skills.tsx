import { SkillList } from "@/components/skills/skill-list";
import { getSkillRoadmaps } from "@/lib/content/load";
import { SectionHeading } from "./section-heading";

/** The non-degree skill roadmaps, each drawn as a short line through its steps. */
export function FeaturedSkills() {
  return (
    <section aria-labelledby="skills-heading" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <SectionHeading id="skills-heading" title="Skills for any course" href="/skills" linkLabel="All skill roadmaps">
        Short roadmaps for things every student has to work out, whatever they study.
      </SectionHeading>
      <SkillList skills={getSkillRoadmaps()} className="mt-6" />
    </section>
  );
}
