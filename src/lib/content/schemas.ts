/**
 * Zod schemas for everything in /content. These are the contract for content authors:
 * a file that doesn't match fails `npm test`, `npm run content:check` and the seed.
 */
import { z } from "zod";
import { DIFFICULTIES, EXAM_IDS, LINE_COLORS, NODE_TYPES, RESOURCE_TYPES, SUBJECT_IDS, TAGS } from "./constants";

export * from "./constants";

/** Slug used for course, roadmap and faculty ids: lowercase words joined by hyphens. */
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be a lowercase-hyphenated slug");

export const tagSchema = z.enum(TAGS);

/** A partial map of tag -> weight (1 = somewhat, 3 = strongly). */
export const tagWeightsSchema = z
  .partialRecord(tagSchema, z.number().int().min(1).max(3))
  .refine((w) => Object.keys(w).length > 0, "needs at least one tag");

export const facultySchema = z.object({
  id: slug,
  name: z.string().min(1),
  description: z.string().min(1),
  color: z.enum(LINE_COLORS),
});
export const facultiesFileSchema = z.array(facultySchema).min(1);

export const resourceSchema = z.object({
  title: z.string().min(1),
  url: z.url({ protocol: /^https$/ }),
  type: z.enum(RESOURCE_TYPES),
  /** Defaults to true. Set false only for paid resources, which should be rare. */
  free: z.boolean().default(true),
});

export const nodeSchema = z.object({
  /** Permanent, globally unique id. Convention: `<course-prefix>-y<year>-<topic>`. */
  id: slug,
  title: z.string().min(1),
  description: z.string().min(20),
  keyConcepts: z.array(z.string().min(1)).min(2),
  type: z.enum(NODE_TYPES),
  /** Year (degree roadmaps) or step (skill roadmaps), starting at 1. */
  stage: z.number().int().min(1),
  /** Id of the topic this one builds on, if any. Must be in the same roadmap. */
  parent: slug.optional(),
  resources: z.array(resourceSchema).min(1, "every node needs at least one free resource"),
});

export const stageSchema = z.object({
  stage: z.number().int().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
});

export const roadmapSchema = z
  .object({
    stages: z.array(stageSchema).min(1),
    nodes: z.array(nodeSchema).min(1),
  })
  .superRefine((roadmap, ctx) => {
    const stages = new Set(roadmap.stages.map((s) => s.stage));
    const byId = new Map(roadmap.nodes.map((n) => [n.id, n]));

    roadmap.stages.forEach((s, i) => {
      if (s.stage !== i + 1) {
        ctx.addIssue({ code: "custom", path: ["stages", i], message: `stages must be numbered 1..n in order` });
      }
    });

    roadmap.nodes.forEach((node, i) => {
      if (!stages.has(node.stage)) {
        ctx.addIssue({ code: "custom", path: ["nodes", i, "stage"], message: `stage ${node.stage} is not declared in "stages"` });
      }
      if (node.parent === undefined) return;
      const parent = byId.get(node.parent);
      if (!parent) {
        ctx.addIssue({ code: "custom", path: ["nodes", i, "parent"], message: `parent "${node.parent}" not found in this roadmap` });
      } else if (parent.stage > node.stage) {
        ctx.addIssue({ code: "custom", path: ["nodes", i, "parent"], message: `parent "${parent.id}" is in a later stage` });
      } else if (parent.id === node.id) {
        ctx.addIssue({ code: "custom", path: ["nodes", i, "parent"], message: "a node cannot be its own parent" });
      }
    });

    const seen = new Set<string>();
    roadmap.nodes.forEach((node, i) => {
      if (seen.has(node.id)) {
        ctx.addIssue({ code: "custom", path: ["nodes", i, "id"], message: `duplicate node id "${node.id}"` });
      }
      seen.add(node.id);
    });

    // Parents can share a stage, so walk each chain to catch loops like A -> B -> A.
    roadmap.nodes.forEach((node, i) => {
      const visited = new Set<string>([node.id]);
      let current = node.parent ? byId.get(node.parent) : undefined;
      while (current) {
        if (visited.has(current.id)) {
          ctx.addIssue({ code: "custom", path: ["nodes", i, "parent"], message: `parent chain from "${node.id}" loops back on itself` });
          return;
        }
        visited.add(current.id);
        current = current.parent ? byId.get(current.parent) : undefined;
      }
    });
  });

export const entryRequirementSchema = z.object({
  exam: z.enum(EXAM_IDS),
  /** The exam's own wording, shown to students, e.g. "Use of English" or "One of: …". */
  subjects: z.array(z.string().min(1)).min(1),
  /**
   * Subjects every applicant must have, as ids from SUBJECTS. Leave out "one of" choices.
   * Powers the directory's "your subjects" filter.
   */
  required: z.array(z.enum(SUBJECT_IDS)).default([]),
  notes: z.string().optional(),
});

export const careerSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

export const courseSchema = z.object({
  id: slug,
  name: z.string().min(1),
  faculty: slug,
  /** One sentence, shown on cards and in meta descriptions (keep under ~160 chars). */
  summary: z.string().min(20).max(200),
  /** A few short paragraphs, separated by blank lines. */
  overview: z.string().min(50),
  durationYears: z.number().int().min(1).max(8),
  durationNotes: z.string().optional(),
  difficulty: z.enum(DIFFICULTIES),
  entryRequirements: z.array(entryRequirementSchema).min(1),
  careers: z.array(careerSchema).min(1),
  tags: tagWeightsSchema,
  /** Optional so a course can be listed (and matched by the quiz) before its roadmap is written. */
  roadmap: roadmapSchema.optional(),
});

export const skillRoadmapSchema = z.object({
  id: slug,
  title: z.string().min(1),
  summary: z.string().min(20).max(200),
  description: z.string().min(50),
  roadmap: roadmapSchema,
});

export type Faculty = z.infer<typeof facultySchema>;
export type Resource = z.infer<typeof resourceSchema>;
export type RoadmapNode = z.infer<typeof nodeSchema>;
export type Stage = z.infer<typeof stageSchema>;
export type Roadmap = z.infer<typeof roadmapSchema>;
export type EntryRequirement = z.infer<typeof entryRequirementSchema>;
export type Course = z.infer<typeof courseSchema>;
export type SkillRoadmap = z.infer<typeof skillRoadmapSchema>;
