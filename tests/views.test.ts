import { describe, expect, it } from "vitest";
import { getCourse } from "@/lib/content/load";
import type { Roadmap, RoadmapNode } from "@/lib/content/schemas";
import { roadmapStops } from "@/lib/content/views";

const node = (id: string, stage: number, type: RoadmapNode["type"]): RoadmapNode => ({
  id,
  title: id,
  description: "A description that is long enough.",
  keyConcepts: ["a", "b"],
  type,
  stage,
  resources: [{ title: "r", url: "https://example.com", type: "article", free: true }],
});

describe("roadmapStops", () => {
  it("gives one stop per stage, named after the stage", () => {
    const roadmap = getCourse("computer-science")!.roadmap!;
    const stops = roadmapStops(roadmap);
    expect(stops.map((s) => s.name)).toEqual(["Year 1", "Year 2", "Year 3", "Final year"]);
    expect(stops.every((s) => s.topic === undefined)).toBe(true);
  });

  it("uses each stage's first core topic", () => {
    const stops = roadmapStops(getCourse("accounting")!.roadmap!, { withTopics: true });
    expect(stops[0]).toEqual({ name: "Year 1", topic: "Principles of Accounting" });
    expect(stops.every((s) => s.topic)).toBe(true);
  });

  it("sorts stages and falls back to the first topic when a stage has no core topic", () => {
    const roadmap: Roadmap = {
      stages: [
        { stage: 2, title: "Two", summary: "s" },
        { stage: 1, title: "One", summary: "s" },
      ],
      nodes: [node("elective-first", 1, "elective"), node("core-later", 1, "core"), node("skill-only", 2, "optional-skill")],
    };
    expect(roadmapStops(roadmap, { withTopics: true })).toEqual([
      { name: "One", topic: "core-later" },
      { name: "Two", topic: "skill-only" },
    ]);
  });
});
