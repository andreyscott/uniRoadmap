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
import {
  courseSchema,
  facultiesFileSchema,
  skillRoadmapSchema,
  type Course,
  type Faculty,
  type SkillRoadmap,
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

// Module-level cache: content never changes while the process runs.
let cached: Content | undefined;
function content(): Content {
  return (cached ??= loadContent());
}

export const getFaculties = () => content().faculties;
export const getFaculty = (id: string) => content().faculties.find((f) => f.id === id);
export const getCourses = () => content().courses;
export const getCourse = (id: string) => content().courses.find((c) => c.id === id);
export const getSkillRoadmaps = () => content().skills;
export const getSkillRoadmap = (id: string) => content().skills.find((s) => s.id === id);
