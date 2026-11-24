import type { Semester } from "@/lib/content/constants";
import type { RoadmapNode, Stage } from "@/lib/content/schemas";

/**
 * A node as the roadmap viewer shows it. General and skill roadmaps use plain content nodes;
 * a university's curriculum adds the module's code, credit units, semester and the general
 * topic it covers.
 */
export interface ViewerNode extends RoadmapNode {
  code?: string;
  creditUnits?: number | null;
  /** Undefined for general roadmaps (no semesters); null for a module that runs all year. */
  semester?: Semester | null;
  generalTopic?: { title: string; href: string } | null;
}

export interface ViewerRoadmap {
  stages: Stage[];
  nodes: ViewerNode[];
}
