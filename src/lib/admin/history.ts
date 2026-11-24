import "server-only";
import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

export type EditEntity = "university" | "universityCourse" | "module" | "role";
export type EditAction = "create" | "update" | "delete" | "move" | "undo";

/** A plain-JSON copy of a row for the log (dates become ISO strings). */
export function snapshot(row: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(row)) as Prisma.InputJsonValue;
}

export async function logEdit(
  tx: Tx,
  userId: string,
  entry: {
    universityId: string | null;
    entity: EditEntity;
    entityId: string;
    action: EditAction;
    summary: string;
    before?: unknown;
    after?: unknown;
  },
) {
  await tx.editLog.create({
    data: {
      userId,
      universityId: entry.universityId,
      entity: entry.entity,
      entityId: entry.entityId,
      action: entry.action,
      summary: entry.summary,
      before: entry.before === undefined ? undefined : snapshot(entry.before),
      after: entry.after === undefined ? undefined : snapshot(entry.after),
    },
  });
}

const UNIVERSITY_FIELDS = ["name", "shortName", "city", "state", "ownership", "website", "description"] as const;
const COURSE_FIELDS = ["department", "faculty", "durationYears", "utmeSubjects", "admissionNotes", "notes"] as const;
// Position is left out on purpose: undoing an edit shouldn't move a module that was reordered since.
const MODULE_FIELDS = ["code", "title", "year", "semester", "creditUnits", "type", "description", "topicId"] as const;
const MODULE_RESTORE_FIELDS = [...MODULE_FIELDS, "position"] as const;

type Snapshot = Record<string, unknown>;
/** The listed fields from a snapshot, typed as the Prisma input they're about to be written as. */
function pick<T>(snap: Snapshot, fields: readonly string[]): T {
  return Object.fromEntries(fields.filter((f) => f in snap).map((f) => [f, snap[f]])) as T;
}

/** Entities and actions that can be reversed. Moves and role changes are logged, not undone. */
export function canUndoKind(entity: string, action: string): boolean {
  return ["university", "universityCourse", "module"].includes(entity) && ["create", "update", "delete"].includes(action);
}

interface UndoableEntry {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  before: Prisma.JsonValue;
  after: Prisma.JsonValue;
}

/**
 * Reverses one logged change. Callers must have checked that it's the latest change to that
 * entity (undoing an older one would wipe out the newer change). Throws a readable Error when
 * the change can no longer be reversed.
 */
export async function reverse(tx: Tx, entry: UndoableEntry) {
  const before = (entry.before ?? {}) as Snapshot;
  const id = entry.entityId;

  switch (`${entry.entity}:${entry.action}`) {
    case "university:create": {
      if (await tx.universityCourse.count({ where: { universityId: id } })) {
        throw new Error("Remove this university's courses first, then undo.");
      }
      await tx.university.delete({ where: { id } });
      return;
    }
    case "university:update":
      await tx.university.update({ where: { id }, data: pick<Prisma.UniversityUpdateInput>(before, UNIVERSITY_FIELDS) });
      return;
    case "university:delete":
      await tx.university.create({ data: { id, ...pick<Omit<Prisma.UniversityCreateInput, "id">>(before, UNIVERSITY_FIELDS) } });
      return;

    case "universityCourse:create": {
      if (await tx.universityModule.count({ where: { universityCourseId: id } })) {
        throw new Error("This course has modules now. Remove them first, then undo.");
      }
      await tx.universityCourse.delete({ where: { id } });
      return;
    }
    case "universityCourse:update":
      await tx.universityCourse.update({ where: { id }, data: pick<Prisma.UniversityCourseUpdateInput>(before, COURSE_FIELDS) });
      return;
    case "universityCourse:delete": {
      await tx.universityCourse.create({
        data: {
          id,
          universityId: before.universityId as string,
          courseId: before.courseId as string,
          ...pick<Omit<Prisma.UniversityCourseUncheckedCreateInput, "id" | "universityId" | "courseId">>(before, COURSE_FIELDS),
        },
      });
      const modules = (before.modules ?? []) as Snapshot[];
      if (modules.length) {
        await tx.universityModule.createMany({
          data: modules.map((m) => ({ id: m.id as string, universityCourseId: id, ...pick<Omit<Prisma.UniversityModuleCreateManyInput, "id" | "universityCourseId">>(m, MODULE_RESTORE_FIELDS) })),
        });
      }
      return;
    }

    case "module:create":
      await tx.universityModule.delete({ where: { id } });
      return;
    case "module:update":
      await tx.universityModule.update({ where: { id }, data: pick<Prisma.UniversityModuleUncheckedUpdateInput>(before, MODULE_FIELDS) });
      return;
    case "module:delete":
      await tx.universityModule.create({
        data: {
          id,
          universityCourseId: before.universityCourseId as string,
          ...pick<Omit<Prisma.UniversityModuleUncheckedCreateInput, "id" | "universityCourseId">>(before, MODULE_RESTORE_FIELDS),
        },
      });
      return;

    default:
      throw new Error("This kind of change can't be undone.");
  }
}
