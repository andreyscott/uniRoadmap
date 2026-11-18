import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ContentError, loadContent } from "@/lib/content/load";
import { roadmapSchema, type Roadmap } from "@/lib/content/schemas";

describe("real content in /content", () => {
  const content = loadContent();

  it("loads and validates", () => {
    expect(content.faculties.length).toBeGreaterThan(0);
    expect(content.courses.length).toBeGreaterThan(0);
    expect(content.skills.length).toBeGreaterThan(0);
  });

  it.each(["computer-science", "medicine-and-surgery", "accounting"])(
    "%s has a full roadmap of 15-30 nodes",
    (id) => {
      const course = content.courses.find((c) => c.id === id);
      expect(course?.roadmap).toBeDefined();
      const count = course!.roadmap!.nodes.length;
      expect(count).toBeGreaterThanOrEqual(15);
      expect(count).toBeLessThanOrEqual(30);
    },
  );

  it("gives every degree stage at least one core node", () => {
    for (const course of content.courses) {
      for (const stage of course.roadmap?.stages ?? []) {
        const core = course.roadmap!.nodes.filter((n) => n.stage === stage.stage && n.type === "core");
        expect(core.length, `${course.id} stage ${stage.stage}`).toBeGreaterThan(0);
      }
    }
  });

  it("has one roadmap stage per year of study", () => {
    for (const course of content.courses) {
      if (course.roadmap) expect(course.roadmap.stages.length, course.id).toBe(course.durationYears);
    }
  });
});

// Minimal valid roadmap used as a base for the failure cases below.
function roadmap(nodes: Partial<Roadmap["nodes"][number]>[]): unknown {
  return {
    stages: [
      { stage: 1, title: "Year 1", summary: "First year" },
      { stage: 2, title: "Year 2", summary: "Second year" },
    ],
    nodes: nodes.map((n, i) => ({
      id: `node-${i}`,
      title: `Node ${i}`,
      description: "A description that is long enough to pass.",
      keyConcepts: ["one", "two"],
      type: "core",
      stage: 1,
      resources: [{ title: "Resource", url: "https://example.com/", type: "article" }],
      ...n,
    })),
  };
}

function issues(input: unknown): string[] {
  const result = roadmapSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.message);
}

describe("roadmap validation", () => {
  it("accepts a valid roadmap", () => {
    expect(issues(roadmap([{ id: "a" }, { id: "b", stage: 2, parent: "a" }]))).toEqual([]);
  });

  it("rejects an unknown parent", () => {
    expect(issues(roadmap([{ id: "a", parent: "missing" }]))).toContain('parent "missing" not found in this roadmap');
  });

  it("rejects a parent in a later stage", () => {
    expect(issues(roadmap([{ id: "a", parent: "b" }, { id: "b", stage: 2 }]))).toContain('parent "b" is in a later stage');
  });

  it("rejects parent loops within a stage", () => {
    const found = issues(roadmap([{ id: "a", parent: "b" }, { id: "b", parent: "a" }]));
    expect(found.some((m) => m.includes("loops back"))).toBe(true);
  });

  it("rejects duplicate node ids", () => {
    expect(issues(roadmap([{ id: "a" }, { id: "a" }]))).toContain('duplicate node id "a"');
  });

  it("rejects a node with no resources", () => {
    expect(issues(roadmap([{ id: "a", resources: [] }]))).toContain("every node needs at least one free resource");
  });

  it("rejects non-https resource links", () => {
    const bad = roadmap([{ id: "a", resources: [{ title: "x", url: "http://example.com", type: "article", free: true }] }]);
    expect(issues(bad).length).toBeGreaterThan(0);
  });

  it("rejects a node in an undeclared stage", () => {
    expect(issues(roadmap([{ id: "a", stage: 3 }]))).toContain('stage 3 is not declared in "stages"');
  });
});

describe("cross-file checks", () => {
  let dir: string;
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  function writeContent(courses: Record<string, unknown>, skills: Record<string, unknown> = {}) {
    dir = mkdtempSync(path.join(tmpdir(), "uniroadmap-content-"));
    mkdirSync(path.join(dir, "courses"));
    mkdirSync(path.join(dir, "skills"));
    writeFileSync(
      path.join(dir, "faculties.json"),
      JSON.stringify([{ id: "sciences", name: "Sciences", description: "Natural sciences.", color: "sciences" }]),
    );
    for (const [file, body] of Object.entries(courses)) writeFileSync(path.join(dir, "courses", file), JSON.stringify(body));
    for (const [file, body] of Object.entries(skills)) writeFileSync(path.join(dir, "skills", file), JSON.stringify(body));
  }

  const course = (id: string, faculty = "sciences", nodeIds: string[] = []) => ({
    id,
    name: id,
    faculty,
    summary: "A summary that is long enough.",
    overview: "An overview that is comfortably longer than fifty characters in total.",
    durationYears: 1,
    difficulty: "beginner",
    entryRequirements: [{ exam: "utme", subjects: ["Use of English"] }],
    careers: [{ title: "Job", description: "Does things." }],
    tags: { maths: 1 },
    ...(nodeIds.length && { roadmap: roadmap(nodeIds.map((nid) => ({ id: nid }))) }),
  });

  it("rejects an unknown faculty", () => {
    writeContent({ "physics.json": course("physics", "nope") });
    expect(() => loadContent(dir)).toThrow(/unknown faculty "nope"/);
  });

  it("rejects a filename that doesn't match the id", () => {
    writeContent({ "wrong-name.json": course("physics") });
    expect(() => loadContent(dir)).toThrow(ContentError);
  });

  it("rejects node ids reused across roadmaps", () => {
    writeContent({
      "physics.json": course("physics", "sciences", ["shared-node"]),
      "chemistry.json": course("chemistry", "sciences", ["shared-node"]),
    });
    expect(() => loadContent(dir)).toThrow(/used in both/);
  });

  it("allows a course without a roadmap", () => {
    writeContent({ "physics.json": course("physics") });
    expect(loadContent(dir).courses[0].roadmap).toBeUndefined();
  });
});
