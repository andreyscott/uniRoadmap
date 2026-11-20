/**
 * Read-only views of a roadmap's parent/child structure, used by the roadmap viewer.
 * Client-safe: type imports only.
 */
import type { Roadmap, RoadmapNode, Stage } from "./schemas";

export interface RoadmapGraph {
  byId: Map<string, RoadmapNode>;
  /** Direct children of each node, in content order. */
  children: Map<string, RoadmapNode[]>;
  /** Stages in order, each with its nodes in content order. */
  stages: { stage: Stage; nodes: RoadmapNode[] }[];
}

export function buildGraph(roadmap: Roadmap): RoadmapGraph {
  const byId = new Map(roadmap.nodes.map((node) => [node.id, node]));
  const children = new Map<string, RoadmapNode[]>();
  for (const node of roadmap.nodes) {
    if (!node.parent) continue;
    children.set(node.parent, [...(children.get(node.parent) ?? []), node]);
  }
  const stages = [...roadmap.stages]
    .sort((a, b) => a.stage - b.stage)
    .map((stage) => ({ stage, nodes: roadmap.nodes.filter((n) => n.stage === stage.stage) }));
  return { byId, children, stages };
}

/** The chain of topics a node builds on, nearest first (parent, grandparent, ...). */
export function ancestorsOf(graph: RoadmapGraph, id: string): RoadmapNode[] {
  const chain: RoadmapNode[] = [];
  const seen = new Set([id]);
  let parentId = graph.byId.get(id)?.parent;
  // The content schema rejects loops; `seen` just makes sure bad data can't hang the page.
  while (parentId && !seen.has(parentId)) {
    const parent = graph.byId.get(parentId);
    if (!parent) break;
    chain.push(parent);
    seen.add(parentId);
    parentId = parent.parent;
  }
  return chain;
}

/** Connections to draw for a selected node: its chain of ancestors, plus its direct children. */
export function routeEdges(graph: RoadmapGraph, id: string): { from: string; to: string; kind: "before" | "after" }[] {
  const edges: { from: string; to: string; kind: "before" | "after" }[] = [];
  let current = id;
  for (const ancestor of ancestorsOf(graph, id)) {
    edges.push({ from: ancestor.id, to: current, kind: "before" });
    current = ancestor.id;
  }
  for (const child of graph.children.get(id) ?? []) edges.push({ from: id, to: child.id, kind: "after" });
  return edges;
}
