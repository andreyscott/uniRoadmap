/**
 * Reads and validates /content. Server-only (uses node:fs); also used by the seed script
 * and tests, so it must not import anything Next.js-specific.
 *
 * Reads are synchronous on purpose: content is static, small, and read at build time, and
 * sync reads keep it usable from prerendered Server Components without extra caching setup.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { z } from "zod";
import type { RoadmapRef } from "@/lib/dashboard/build";
import {
  courseSchema,
  facultiesFileSchema,
  quizFileSchema,
  universitiesFileSchema,
  skillRoadmapSchema,
  type Course,
  type Faculty,
  type Quiz,
  type SkillRoadmap,
  type UniversitySeed,
} from "./schemas";

export const CONTENT_DIR = path.join(process.cwd(), "content");

export class ContentError extends Error {}

function readJson<T>(file: string, schema: z.ZodType<T>): T {
  const relative = path.relative(process.cwd(), file);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    throw new ContentError(`${relative}: invalid JSON (${(err as Error).message})`);
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new ContentError(`${relative} failed validation:\n${issues}`);
  }
  return result.data;
}

function readDir<T extends { id: string }>(dir: string, schema: z.ZodType<T>): T[] {
  const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  return files.map((f) => {
    const item = readJson(path.join(dir, f), schema);
    // The filename is the URL slug, so it must match the id inside the file.
    if (`${item.id}.json` !== f) {
      throw new ContentError(`${path.relative(process.cwd(), path.join(dir, f))}: id "${item.id}" must match the filename`);
    }
    return item;
  });
}

export interface Content {
  faculties: Faculty[];
  courses: Course[];
  skills: SkillRoadmap[];
}

/** Loads everything and runs checks that span files (faculty refs, global node id uniqueness). */
export function loadContent(dir: string = CONTENT_DIR): Content {
  const faculties = readJson(path.join(dir, "faculties.json"), facultiesFileSchema);
  const courses = readDir(path.join(dir, "courses"), courseSchema);
  const skills = readDir(path.join(dir, "skills"), skillRoadmapSchema);

  const facultyIds = new Set(faculties.map((f) => f.id));
  for (const course of courses) {
    if (!facultyIds.has(course.faculty)) {
      throw new ContentError(`courses/${course.id}.json: unknown faculty "${course.faculty}"`);
    }
  }

  // Node ids are primary keys across every roadmap, so they must be unique site-wide.
  const owners = new Map<string, string>();
  const roadmaps = [
    ...courses.flatMap((c) => (c.roadmap ? [{ id: c.id, roadmap: c.roadmap }] : [])),
    ...skills.map((s) => ({ id: s.id, roadmap: s.roadmap })),
  ];
  for (const { id, roadmap } of roadmaps) {
    for (const node of roadmap.nodes) {
      const owner = owners.get(node.id);
      if (owner) throw new ContentError(`node id "${node.id}" is used in both "${owner}" and "${id}"`);
      owners.set(node.id, id);
    }
  }

  return { faculties, courses, skills };
}

// Module-level cache: in production, content never changes while the process runs.
// In development, re-read on every call so edits to content/ show up on refresh.
let cached: Content | undefined;
function content(): Content {
  if (process.env.NODE_ENV === "development") return loadContent();
  return (cached ??= loadContent());
}

export const getFaculties = () => content().faculties;
export const getFaculty = (id: string) => content().faculties.find((f) => f.id === id);
export const getCourses = () => content().courses;
export const getCourse = (id: string) => content().courses.find((c) => c.id === id);
export const getSkillRoadmaps = () => content().skills;
export const getSkillRoadmap = (id: string) => content().skills.find((s) => s.id === id);

/** The course finder quiz (content/quiz.json). */
export function loadQuiz(dir: string = CONTENT_DIR): Quiz {
  return readJson(path.join(dir, "quiz.json"), quizFileSchema);
}

let cachedQuiz: Quiz | undefined;
export function getQuiz(): Quiz {
  if (process.env.NODE_ENV === "development") return loadQuiz();
  return (cachedQuiz ??= loadQuiz());
}

let nodeIndex: Map<string, string> | undefined;
/** The roadmap a node id belongs to (course or skill id), or undefined for an unknown id. */
export function findNodeRoadmap(nodeId: string): string | undefined {
  if (!nodeIndex || process.env.NODE_ENV === "development") {
    const { courses, skills } = content();
    nodeIndex = new Map([
      ...courses.flatMap((c) => (c.roadmap?.nodes ?? []).map((n) => [n.id, c.id] as const)),
      ...skills.flatMap((s) => s.roadmap.nodes.map((n) => [n.id, s.id] as const)),
    ]);
  }
  return nodeIndex.get(nodeId);
}

/** True when the id is a course with a roadmap, or a skill roadmap. */
export function roadmapExists(id: string): boolean {
  return Boolean(getCourse(id)?.roadmap || getSkillRoadmap(id));
}

/** A course roadmap or skill roadmap by id, in the shape the dashboard uses. */
export function getRoadmapRef(id: string): RoadmapRef | undefined {
  const course = getCourse(id);
  if (course?.roadmap) {
    // The loader has already checked that every course's faculty exists.
    const color = getFaculty(course.faculty)!.color;
    return { id, kind: "course", title: course.name, href: `/courses/${id}`, color, roadmap: course.roadmap };
  }
  const skill = getSkillRoadmap(id);
  if (skill) return { id, kind: "skill", title: skill.title, href: `/skills/${id}`, color: "skills", roadmap: skill.roadmap };
  return undefined;
}

/** The starter list of universities (content/universities.json). Only the seed uses it. */
export function loadUniversities(dir: string = CONTENT_DIR): UniversitySeed[] {
  return readJson(path.join(dir, "universities.json"), universitiesFileSchema).universities;
}
