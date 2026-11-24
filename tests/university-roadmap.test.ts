import { describe, expect, it } from "vitest";
import { getCourse } from "@/lib/content/load";
import type { PublicModule } from "@/lib/universities/queries";
import { toViewerRoadmap } from "@/lib/universities/roadmap";

// Example modules for the tests only; real curricula are entered by editors.
const mod = (overrides: Partial<PublicModule>): PublicModule => ({
  id: "m1",
  code: "TST 101",
  title: "Example module",
  year: 1,
  semester: "first",
  creditUnits: 3,
  type: "core",
  description: null,
  topicId: null,
  ...overrides,
});

describe("toViewerRoadmap", () => {
  const cs = getCourse("computer-science")!;

  it("makes one station per year and summarises modules and units", () => {
    const roadmap = toViewerRoadmap([mod({}), mod({ id: "m2", creditUnits: 2 }), mod({ id: "m3", year: 2 })], 4, cs);
    expect(roadmap.stages.map((s) => s.title)).toEqual(["Year 1", "Year 2", "Year 3", "Final year"]);
    expect(roadmap.stages[0].summary).toBe("2 modules, 5 credit units.");
    expect(roadmap.stages[2].summary).toBe("No modules added for this year yet.");
  });

  it("borrows explanation, concepts and resources from a linked general topic", () => {
    const [node] = toViewerRoadmap([mod({ topicId: "cs-y2-data-structures", year: 2 })], 4, cs).nodes;
    const topic = cs.roadmap!.nodes.find((n) => n.id === "cs-y2-data-structures")!;
    expect(node).toMatchObject({
      description: topic.description,
      keyConcepts: topic.keyConcepts,
      resources: topic.resources,
      code: "TST 101",
      generalTopic: { title: "Data Structures", href: "/courses/computer-science#cs-y2-data-structures" },
    });
  });

  it("keeps the module's own description, and copes with no general roadmap", () => {
    const [node] = toViewerRoadmap([mod({ description: "Taught with Python." })], 4).nodes;
    expect(node).toMatchObject({ description: "Taught with Python.", keyConcepts: [], resources: [], generalTopic: null });
  });

  it("adds years when a module sits beyond the stated length", () => {
    expect(toViewerRoadmap([mod({ year: 5 })], 4, cs).stages).toHaveLength(5);
  });
});
