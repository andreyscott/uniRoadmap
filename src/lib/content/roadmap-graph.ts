/**
 * Read-only views of a roadmap's parent/child structure, used by the roadmap viewer.
 * Client-safe: type imports only. Generic over the node type, so university modules
 * (nodes with a code and credit units) keep their extra fields.
 */
import type { RoadmapNode, Stage } from "./schemas";

export interface RoadmapGraph<N extends RoadmapNode = RoadmapNode> {
  byId: Map<string, N>;
  /** Direct children of each node, in content order. */
  children: Map<string, N[]>;
  /** Stages in order, each with its nodes in content order. */
  stages: { stage: Stage; nodes: N[] }[];
}

export function buildGraph<N extends RoadmapNode>(roadmap: { stages: Stage[]; nodes: N[] }): RoadmapGraph<N> {
  const byId = new Map(roadmap.nodes.map((node) => [node.id, node]));
  const children = new Map<string, N[]>();
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
export function ancestorsOf<N extends RoadmapNode>(graph: RoadmapGraph<N>, id: string): N[] {
  const chain: N[] = [];
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
export function routeEdges<N extends RoadmapNode>(
  graph: RoadmapGraph<N>,
  id: string,
): { from: string; to: string; kind: "before" | "after" }[] {
  const edges: { from: string; to: string; kind: "before" | "after" }[] = [];
  let current = id;
  for (const ancestor of ancestorsOf(graph, id)) {
    edges.push({ from: ancestor.id, to: current, kind: "before" });
    current = ancestor.id;
  }
  for (const child of graph.children.get(id) ?? []) edges.push({ from: id, to: child.id, kind: "after" });
  return edges;
}
