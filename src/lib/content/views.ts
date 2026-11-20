import type { Roadmap } from "./schemas";

/** One stop on a route line: a roadmap stage, optionally with a topic that represents it. */
export interface RouteStop {
  /** Stage title, e.g. "Year 1" or "Get organised". */
  name: string;
  /** A topic shown under the stage name, e.g. "Programming Fundamentals". */
  topic?: string;
}

/**
 * Turns a roadmap into one stop per stage, in stage order.
 *
 * With `withTopics`, each stop also names the stage's first core topic (falling back to its
 * first topic of any type). Content authors control this by listing the topic that best
 * defines a year first; see content/README.md.
 */
export function roadmapStops(roadmap: Roadmap, { withTopics = false } = {}): RouteStop[] {
  return [...roadmap.stages]
    .sort((a, b) => a.stage - b.stage)
    .map((stage) => {
      if (!withTopics) return { name: stage.title };
      const inStage = roadmap.nodes.filter((node) => node.stage === stage.stage);
      const topic = (inStage.find((node) => node.type === "core") ?? inStage[0])?.title;
      return { name: stage.title, topic };
    });
}
