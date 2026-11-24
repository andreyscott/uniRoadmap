import type { ViewerNode, ViewerRoadmap } from "@/components/roadmap/types";
import type { Course } from "@/lib/content/schemas";
import type { PublicModule } from "./queries";

/**
 * Turns a university's curriculum into the shape the roadmap viewer draws: one station per
 * year, one stop per module. A module linked to a general topic borrows that topic's
 * explanation (when it has none of its own), key concepts and free resources.
 */
export function toViewerRoadmap(modules: PublicModule[], durationYears: number, general?: Course): ViewerRoadmap {
  const topics = new Map((general?.roadmap?.nodes ?? []).map((n) => [n.id, n]));
  const years = Math.max(durationYears, ...modules.map((m) => m.year));

  const stages = Array.from({ length: years }, (_, i) => {
    const year = i + 1;
    const inYear = modules.filter((m) => m.year === year);
    const units = inYear.reduce((sum, m) => sum + (m.creditUnits ?? 0), 0);
    return {
      stage: year,
      title: year === years ? "Final year" : `Year ${year}`,
      summary: inYear.length
        ? `${inYear.length} ${inYear.length === 1 ? "module" : "modules"}${units ? `, ${units} credit units` : ""}.`
        : "No modules added for this year yet.",
    };
  });

  const nodes: ViewerNode[] = modules.map((m) => {
    const topic = m.topicId ? topics.get(m.topicId) : undefined;
    return {
      id: m.id,
      title: m.title,
      description: m.description ?? topic?.description ?? "",
      keyConcepts: topic?.keyConcepts ?? [],
      type: m.type,
      stage: m.year,
      resources: topic?.resources ?? [],
      code: m.code,
      creditUnits: m.creditUnits,
      semester: m.semester,
      generalTopic: topic && general ? { title: topic.title, href: `/courses/${general.id}#${topic.id}` } : null,
    };
  });

  return { stages, nodes };
}
