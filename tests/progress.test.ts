import { describe, expect, it } from "vitest";
import { findNodeRoadmap, roadmapExists } from "@/lib/content/load";
import { summariseProgress } from "@/lib/progress/status";
import { safeNextPath } from "@/lib/supabase/config";

describe("summariseProgress", () => {
  const ids = ["a", "b", "c", "d", "e"];

  it("counts statuses and leaves skipped topics out of the percentage", () => {
    expect(summariseProgress(ids, { a: "done", b: "done", c: "in-progress", d: "skipped" })).toEqual({
      total: 5,
      done: 2,
      inProgress: 1,
      skipped: 1,
      counted: 4,
      percent: 50,
    });
  });

  it("ignores progress for topics outside the set", () => {
    expect(summariseProgress(["a"], { a: "done", zzz: "done" }).done).toBe(1);
  });

  it("is 0% with nothing done, and when every topic is skipped", () => {
    expect(summariseProgress(ids, {}).percent).toBe(0);
    expect(summariseProgress(["a"], { a: "skipped" }).percent).toBe(0);
  });
});

describe("findNodeRoadmap and roadmapExists", () => {
  it("finds the roadmap a node belongs to", () => {
    expect(findNodeRoadmap("cs-y1-calculus")).toBe("computer-science");
    expect(findNodeRoadmap("ss-active-recall")).toBe("study-skills");
    expect(findNodeRoadmap("nope")).toBeUndefined();
  });

  it("only accepts ids that have a roadmap", () => {
    expect(roadmapExists("computer-science")).toBe(true);
    expect(roadmapExists("exam-prep")).toBe(true);
    expect(roadmapExists("nursing")).toBe(false); // listed course, no roadmap yet
    expect(roadmapExists("nope")).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps paths on this site", () => {
    expect(safeNextPath("/courses/law")).toBe("/courses/law");
    expect(safeNextPath("/courses/computer-science#cs-y1-calculus")).toBe("/courses/computer-science#cs-y1-calculus");
  });

  it("rejects other sites and falls back", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "", null]) {
      expect(safeNextPath(bad)).toBe("/");
    }
    expect(safeNextPath(null, "/dashboard")).toBe("/dashboard");
  });
});
