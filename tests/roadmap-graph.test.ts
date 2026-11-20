import { describe, expect, it } from "vitest";
import { getCourse } from "@/lib/content/load";
import { ancestorsOf, buildGraph, routeEdges } from "@/lib/content/roadmap-graph";
import type { Roadmap } from "@/lib/content/schemas";

const graph = buildGraph(getCourse("computer-science")!.roadmap!);

describe("buildGraph", () => {
  it("groups nodes by stage in order", () => {
    expect(graph.stages.map((s) => s.stage.title)).toEqual(["Year 1", "Year 2", "Year 3", "Final year"]);
    expect(graph.stages[0].nodes[0].id).toBe("cs-y1-intro-computing");
    expect(graph.stages.reduce((n, s) => n + s.nodes.length, 0)).toBe(graph.byId.size);
  });

  it("indexes children in content order", () => {
    expect(graph.children.get("cs-y3-networks")?.map((n) => n.id)).toEqual([
      "cs-y4-security",
      "cs-y4-distributed-systems",
    ]);
  });
});

describe("ancestorsOf", () => {
  it("walks the parent chain, nearest first", () => {
    expect(ancestorsOf(graph, "cs-y3-networks").map((n) => n.id)).toEqual([
      "cs-y3-operating-systems",
      "cs-y2-computer-architecture",
      "cs-y1-intro-computing",
    ]);
  });

  it("is empty for a root topic or an unknown id", () => {
    expect(ancestorsOf(graph, "cs-y1-calculus")).toEqual([]);
    expect(ancestorsOf(graph, "nope")).toEqual([]);
  });

  it("stops on a loop instead of hanging", () => {
    const looped = buildGraph({
      stages: [{ stage: 1, title: "One", summary: "s" }],
      nodes: [
        { id: "a", parent: "b", stage: 1 },
        { id: "b", parent: "a", stage: 1 },
      ] as Roadmap["nodes"],
    });
    expect(ancestorsOf(looped, "a").map((n) => n.id)).toEqual(["b"]);
  });
});

describe("routeEdges", () => {
  it("links the ancestor chain and the direct children", () => {
    expect(routeEdges(graph, "cs-y3-networks")).toEqual([
      { from: "cs-y3-operating-systems", to: "cs-y3-networks", kind: "before" },
      { from: "cs-y2-computer-architecture", to: "cs-y3-operating-systems", kind: "before" },
      { from: "cs-y1-intro-computing", to: "cs-y2-computer-architecture", kind: "before" },
      { from: "cs-y3-networks", to: "cs-y4-security", kind: "after" },
      { from: "cs-y3-networks", to: "cs-y4-distributed-systems", kind: "after" },
    ]);
  });
});
