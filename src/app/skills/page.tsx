import type { Metadata } from "next";
import { SkillList } from "@/components/skills/skill-list";
import { getSkillRoadmaps } from "@/lib/content/load";

export const ensureStatic = "navigation";

export const metadata: Metadata = {
  title: "Skill roadmaps",
  description:
    "Step-by-step roadmaps for study skills, exam prep, internship hunting and research, with free resources for every step.",
  alternates: { canonical: "/skills" },
};

export default function SkillsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Skill roadmaps</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        Short roadmaps for the skills every student needs, whatever they study. Each step links to
        free resources.
      </p>
      <SkillList skills={getSkillRoadmaps()} className="mt-8" />
    </div>
  );
}
