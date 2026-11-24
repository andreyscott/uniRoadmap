import "server-only";
import { getDb } from "@/lib/db";
import type { StaffContext } from "./access";
import { canUndoKind } from "./history";

/*
 * Reads for /admin. Uncached on purpose: editors should always see the current data.
 * Callers check access first (see access.ts).
 */

export function listUniversitiesFor(ctx: StaffContext) {
  return getDb().university.findMany({
    where: ctx.isAdmin ? {} : { id: { in: [...ctx.universityIds] } },
    orderBy: { name: "asc" },
    include: { _count: { select: { courses: true } } },
  });
}

export function getUniversityAdmin(id: string) {
  return getDb().university.findUnique({
    where: { id },
    include: {
      courses: {
        orderBy: { course: { name: "asc" } },
        include: { course: { select: { name: true } }, _count: { select: { modules: true } } },
      },
    },
  });
}

export function getUniversityCourseAdmin(universityId: string, courseId: string) {
  return getDb().universityCourse.findUnique({
    where: { universityId_courseId: { universityId, courseId } },
    include: {
      university: { select: { id: true, name: true, shortName: true } },
      course: { select: { id: true, name: true, durationYears: true } },
      modules: { orderBy: [{ year: "asc" }, { semester: { sort: "asc", nulls: "last" } }, { position: "asc" }] },
    },
  });
}

/** Courses in the database (seeded from content/) that a university doesn't offer yet. */
export async function coursesNotOffered(universityId: string) {
  return getDb().course.findMany({
    where: { offerings: { none: { universityId } } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export function listStaff() {
  return getDb().user.findMany({
    where: { role: { in: ["ADMIN", "EDITOR"] } },
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: {
      id: true,
      email: true,
      role: true,
      editorOf: { select: { university: { select: { id: true, shortName: true } } } },
    },
  });
}

export function listAllUniversityNames() {
  return getDb().university.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, shortName: true } });
}

/**
 * Recent changes this person can see (admins: all; editors: their universities), each marked
 * undoable when it's the latest, not-yet-undone change to an entity that supports undo.
 */
export async function listHistory(ctx: StaffContext, limit = 60) {
  const db = getDb();
  const entries = await db.editLog.findMany({
    where: ctx.isAdmin ? {} : { universityId: { in: [...ctx.universityIds] } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { email: true } } },
  });

  // The latest live entry per entity decides what can be undone. Undos and reorders don't count:
  // they aren't undoable themselves and shouldn't block undoing the edit before them.
  const entities = [...new Set(entries.map((e) => `${e.entity}:${e.entityId}`))];
  const latest = new Map<string, string>();
  await Promise.all(
    entities.map(async (key) => {
      const split = key.indexOf(":");
      const entity = key.slice(0, split);
      const entityId = key.slice(split + 1);
      const row = await db.editLog.findFirst({
        where: { entity, entityId, undoneAt: null, action: { notIn: ["undo", "move"] } },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (row) latest.set(key, row.id);
    }),
  );

  return entries.map((entry) => ({
    ...entry,
    undoable:
      !entry.undoneAt &&
      canUndoKind(entry.entity, entry.action) &&
      latest.get(`${entry.entity}:${entry.entityId}`) === entry.id,
  }));
}
