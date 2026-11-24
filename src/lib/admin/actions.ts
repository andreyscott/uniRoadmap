"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { getCourse } from "@/lib/content/load";
import { getDb } from "@/lib/db";
import { UNIVERSITIES_TAG, universityTag } from "@/lib/universities/tags";
import { adminOnly, staffFor } from "./access";
import { logEdit, reverse } from "./history";
import {
  firstIssue,
  moduleSchema,
  newUniversitySchema,
  readForm,
  universityCourseSchema,
  universitySchema,
  type FormState,
} from "./validation";

/*
 * Every action here is a public endpoint: each one checks the caller's access, validates its
 * input, writes the change and its log entry in one transaction, then expires the cached public
 * pages for that university so students see the change on their next request.
 */

const NO_ACCESS: FormState = { status: "error", message: "You don't have access to change this." };
const FAILED: FormState = { status: "error", message: "That couldn't be saved. Try again in a moment." };

const toEnum = <T extends string>(value: string) => value.toUpperCase().replaceAll("-", "_") as T;

function published(universityId: string) {
  updateTag(universityTag(universityId));
  updateTag(UNIVERSITIES_TAG);
  refresh();
}

async function attempt(work: () => Promise<FormState>): Promise<FormState> {
  try {
    return await work();
  } catch (err) {
    console.error("[admin] action failed:", err);
    return err instanceof Error && err.name === "UserFacingError" ? { status: "error", message: err.message } : FAILED;
  }
}

function userFacing(message: string) {
  const err = new Error(message);
  err.name = "UserFacingError";
  return err;
}

const UNIVERSITY_FIELDS = ["name", "shortName", "city", "state", "ownership", "website", "description"] as const;

// ---------- Universities ----------

export async function createUniversity(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await adminOnly();
  if (!ctx) return NO_ACCESS;
  const input = newUniversitySchema.safeParse(readForm(formData, ["id", ...UNIVERSITY_FIELDS]));
  if (!input.success) return { status: "error", message: firstIssue(input.error) };

  const { id, ownership, ...rest } = input.data;
  const result = await attempt(async () => {
    const db = getDb();
    if (await db.university.findUnique({ where: { id }, select: { id: true } })) {
      return { status: "error", message: `Web address: "${id}" is already used by another university.` };
    }
    await db.$transaction(async (tx) => {
      const created = await tx.university.create({ data: { id, ownership: toEnum<"FEDERAL" | "STATE" | "PRIVATE">(ownership), ...rest } });
      await logEdit(tx, ctx.user.id, {
        universityId: id,
        entity: "university",
        entityId: id,
        action: "create",
        summary: `Added ${created.name} (${created.shortName})`,
        after: created,
      });
    });
    published(id);
    return { status: "saved", message: "Saved." };
  });
  if (result.status === "saved") redirect(`/admin/universities/${id}`);
  return result;
}

export async function updateUniversity(universityId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await staffFor(universityId);
  if (!ctx) return NO_ACCESS;
  const input = universitySchema.safeParse(readForm(formData, UNIVERSITY_FIELDS));
  if (!input.success) return { status: "error", message: firstIssue(input.error) };

  return attempt(async () => {
    await getDb().$transaction(async (tx) => {
      const before = await tx.university.findUniqueOrThrow({ where: { id: universityId } });
      const after = await tx.university.update({
        where: { id: universityId },
        data: { ...input.data, ownership: toEnum<"FEDERAL" | "STATE" | "PRIVATE">(input.data.ownership) },
      });
      await logEdit(tx, ctx.user.id, {
        universityId,
        entity: "university",
        entityId: universityId,
        action: "update",
        summary: `Updated details of ${after.shortName}`,
        before,
        after,
      });
    });
    published(universityId);
    return { status: "saved", message: "Saved. Students see the change straight away." };
  });
}

export async function deleteUniversity(universityId: string): Promise<FormState> {
  const ctx = await adminOnly();
  if (!ctx) return NO_ACCESS;
  const result = await attempt(async () => {
    await getDb().$transaction(async (tx) => {
      const row = await tx.university.findUniqueOrThrow({ where: { id: universityId } });
      if (await tx.universityCourse.count({ where: { universityId } })) {
        throw userFacing("Remove this university's courses before deleting it.");
      }
      await tx.university.delete({ where: { id: universityId } });
      await logEdit(tx, ctx.user.id, {
        universityId,
        entity: "university",
        entityId: universityId,
        action: "delete",
        summary: `Deleted ${row.name} (${row.shortName})`,
        before: row,
      });
    });
    published(universityId);
    return { status: "saved", message: "Deleted." };
  });
  if (result.status === "saved") redirect("/admin");
  return result;
}

// ---------- Courses offered by a university ----------

export async function addUniversityCourse(universityId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await staffFor(universityId);
  if (!ctx) return NO_ACCESS;
  const courseId = String(formData.get("courseId") ?? "");
  const course = getCourse(courseId);
  if (!course) return { status: "error", message: "Course: choose a course from the list." };

  return attempt(async () => {
    const db = getDb();
    if (!(await db.course.findUnique({ where: { id: courseId }, select: { id: true } }))) {
      return { status: "error", message: "That course isn't in the database yet. Run npm run db:seed, then try again." };
    }
    await db.$transaction(async (tx) => {
      const created = await tx.universityCourse.create({ data: { universityId, courseId, utmeSubjects: [] } });
      const uni = await tx.university.findUniqueOrThrow({ where: { id: universityId }, select: { shortName: true } });
      await logEdit(tx, ctx.user.id, {
        universityId,
        entity: "universityCourse",
        entityId: created.id,
        action: "create",
        summary: `Added ${course.name} to ${uni.shortName}`,
        after: created,
      });
    });
    published(universityId);
    return { status: "saved", message: `Added ${course.name}.` };
  });
}

export async function updateUniversityCourse(
  universityId: string,
  universityCourseId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await staffFor(universityId);
  if (!ctx) return NO_ACCESS;
  const input = universityCourseSchema.safeParse(
    readForm(formData, ["department", "faculty", "durationYears", "utmeSubjects", "admissionNotes", "notes"]),
  );
  if (!input.success) return { status: "error", message: firstIssue(input.error) };

  return attempt(async () => {
    await getDb().$transaction(async (tx) => {
      const before = await tx.universityCourse.findFirstOrThrow({ where: { id: universityCourseId, universityId } });
      const after = await tx.universityCourse.update({ where: { id: universityCourseId }, data: input.data });
      await logEdit(tx, ctx.user.id, {
        universityId,
        entity: "universityCourse",
        entityId: universityCourseId,
        action: "update",
        summary: `Updated ${getCourse(before.courseId)?.name ?? before.courseId} details`,
        before,
        after,
      });
    });
    published(universityId);
    return { status: "saved", message: "Saved. Students see the change straight away." };
  });
}

export async function removeUniversityCourse(universityId: string, universityCourseId: string): Promise<FormState> {
  const ctx = await staffFor(universityId);
  if (!ctx) return NO_ACCESS;
  return attempt(async () => {
    await getDb().$transaction(async (tx) => {
      const before = await tx.universityCourse.findFirstOrThrow({
        where: { id: universityCourseId, universityId },
        include: { modules: true, university: { select: { shortName: true } } },
      });
      await tx.universityCourse.delete({ where: { id: universityCourseId } });
      const { university, ...row } = before;
      await logEdit(tx, ctx.user.id, {
        universityId,
        entity: "universityCourse",
        entityId: universityCourseId,
        action: "delete",
        summary: `Removed ${getCourse(row.courseId)?.name ?? row.courseId} (${row.modules.length} modules) from ${university.shortName}`,
        // Modules are kept in the snapshot so undo can bring them back.
        before: row,
      });
    });
    published(universityId);
    return { status: "saved", message: "Removed." };
  });
}

// ---------- Modules ----------

/** Module changes count as changes to the course, for its "last updated" date. */
async function touchCourse(tx: Prisma.TransactionClient, id: string) {
  await tx.universityCourse.update({ where: { id }, data: { updatedAt: new Date() } });
}

const MODULE_FIELDS = ["code", "title", "year", "semester", "creditUnits", "type", "description", "topicId"] as const;

/** Validates a module form against this course (years in range, topic from its general roadmap). */
async function parseModule(universityCourseId: string, universityId: string, formData: FormData) {
  const input = moduleSchema.safeParse(readForm(formData, MODULE_FIELDS));
  if (!input.success) return { error: firstIssue(input.error) } as const;
  const uc = await getDb().universityCourse.findFirst({
    where: { id: universityCourseId, universityId },
    select: { courseId: true, durationYears: true },
  });
  if (!uc) return { error: "That course isn't offered at this university any more." } as const;
  const course = getCourse(uc.courseId);
  const years = uc.durationYears ?? course?.durationYears ?? 8;
  if (input.data.year > years) return { error: `Year: this course runs for ${years} years.` } as const;
  if (input.data.topicId && !course?.roadmap?.nodes.some((n) => n.id === input.data.topicId)) {
    return { error: "General topic: choose one from the list." } as const;
  }
  return {
    data: {
      ...input.data,
      semester: input.data.semester ? toEnum<"FIRST" | "SECOND">(input.data.semester) : null,
      type: toEnum<"CORE" | "ELECTIVE" | "OPTIONAL_SKILL">(input.data.type),
    },
  } as const;
}

export async function addModule(universityId: string, universityCourseId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await staffFor(universityId);
  if (!ctx) return NO_ACCESS;
  const parsed = await parseModule(universityCourseId, universityId, formData);
  if ("error" in parsed) return { status: "error", message: parsed.error! };

  return attempt(async () => {
    await getDb().$transaction(async (tx) => {
      // New modules go to the end of their year and semester.
      const last = await tx.universityModule.findFirst({
        where: { universityCourseId, year: parsed.data.year, semester: parsed.data.semester },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      const created = await tx.universityModule.create({
        data: { ...parsed.data, universityCourseId, position: (last?.position ?? -1) + 1 },
      });
      await touchCourse(tx, universityCourseId);
      await logEdit(tx, ctx.user.id, {
        universityId,
        entity: "module",
        entityId: created.id,
        action: "create",
        summary: `Added module ${created.code} ${created.title}`,
        after: created,
      });
    });
    published(universityId);
    return { status: "saved", message: "Module added." };
  });
}

export async function updateModule(
  universityId: string,
  universityCourseId: string,
  moduleId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await staffFor(universityId);
  if (!ctx) return NO_ACCESS;
  const parsed = await parseModule(universityCourseId, universityId, formData);
  if ("error" in parsed) return { status: "error", message: parsed.error! };

  return attempt(async () => {
    await getDb().$transaction(async (tx) => {
      const before = await tx.universityModule.findFirstOrThrow({ where: { id: moduleId, universityCourseId } });
      const after = await tx.universityModule.update({ where: { id: moduleId }, data: parsed.data });
      await touchCourse(tx, universityCourseId);
      await logEdit(tx, ctx.user.id, {
        universityId,
        entity: "module",
        entityId: moduleId,
        action: "update",
        summary: `Updated module ${after.code} ${after.title}`,
        before,
        after,
      });
    });
    published(universityId);
    return { status: "saved", message: "Saved." };
  });
}

export async function deleteModule(universityId: string, universityCourseId: string, moduleId: string): Promise<FormState> {
  const ctx = await staffFor(universityId);
  if (!ctx) return NO_ACCESS;
  return attempt(async () => {
    await getDb().$transaction(async (tx) => {
      const before = await tx.universityModule.findFirstOrThrow({ where: { id: moduleId, universityCourseId } });
      await tx.universityModule.delete({ where: { id: moduleId } });
      await touchCourse(tx, universityCourseId);
      await logEdit(tx, ctx.user.id, {
        universityId,
        entity: "module",
        entityId: moduleId,
        action: "delete",
        summary: `Deleted module ${before.code} ${before.title}`,
        before,
      });
    });
    published(universityId);
    return { status: "saved", message: "Deleted." };
  });
}

/** Swaps a module with its neighbour in the same year and semester. */
export async function moveModule(
  universityId: string,
  universityCourseId: string,
  moduleId: string,
  direction: "up" | "down",
): Promise<FormState> {
  const ctx = await staffFor(universityId);
  if (!ctx) return NO_ACCESS;
  return attempt(async () => {
    await getDb().$transaction(async (tx) => {
      const mod = await tx.universityModule.findFirstOrThrow({ where: { id: moduleId, universityCourseId } });
      const group = await tx.universityModule.findMany({
        where: { universityCourseId, year: mod.year, semester: mod.semester },
        orderBy: [{ position: "asc" }, { id: "asc" }],
      });
      const index = group.findIndex((m) => m.id === moduleId);
      const other = group[direction === "up" ? index - 1 : index + 1];
      if (!other) return;
      // Renumber the whole group so duplicate positions from older data can't make swaps stick.
      const order = group.map((m) => m.id);
      order.splice(index, 1);
      order.splice(direction === "up" ? index - 1 : index + 1, 0, moduleId);
      await Promise.all(order.map((id, position) => tx.universityModule.update({ where: { id }, data: { position } })));
      await touchCourse(tx, universityCourseId);
      await logEdit(tx, ctx.user.id, {
        universityId,
        entity: "module",
        entityId: moduleId,
        action: "move",
        summary: `Moved ${mod.code} ${direction} (above ${direction === "up" ? other.code : "the next module"})`.replace(
          / \(above the next module\)$/,
          ` (below ${other.code})`,
        ),
      });
    });
    published(universityId);
    return { status: "saved", message: "Moved." };
  });
}

// ---------- People ----------

export async function setPersonAccess(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await adminOnly();
  if (!ctx) return NO_ACCESS;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");
  const universityIds = formData.getAll("universities").map(String);
  if (!email.includes("@")) return { status: "error", message: "Email: enter the email address they sign in with." };
  if (!["student", "editor", "admin"].includes(role)) return { status: "error", message: "Access: choose an option." };
  if (role === "editor" && universityIds.length === 0) {
    return { status: "error", message: "Universities: tick at least one university this editor can change." };
  }

  return attempt(async () => {
    const db = getDb();
    const person = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (!person) {
      return {
        status: "error",
        message: "There's no account with that email yet. Ask them to sign in once, then try again.",
      };
    }
    if (person.id === ctx.user.id && role !== "admin") {
      return { status: "error", message: "You can't remove your own admin access. Ask another admin." };
    }
    const unis = await db.university.findMany({ where: { id: { in: universityIds } }, select: { id: true, shortName: true } });
    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: person.id }, data: { role: toEnum<"STUDENT" | "EDITOR" | "ADMIN">(role) } });
      await tx.universityEditor.deleteMany({ where: { userId: person.id } });
      if (role === "editor") {
        await tx.universityEditor.createMany({ data: unis.map((u) => ({ userId: person.id, universityId: u.id })) });
      }
      const summary =
        role === "admin"
          ? `Made ${email} an admin`
          : role === "editor"
            ? `Made ${email} an editor of ${unis.map((u) => u.shortName).join(", ")}`
            : `Removed editing access from ${email}`;
      await logEdit(tx, ctx.user.id, { universityId: null, entity: "role", entityId: person.id, action: "update", summary });
    });
    refresh();
    return { status: "saved", message: "Access updated." };
  });
}

// ---------- History ----------

export async function undoEdit(entryId: string): Promise<FormState> {
  const db = getDb();
  const entry = await db.editLog.findUnique({ where: { id: entryId } });
  if (!entry?.universityId) return { status: "error", message: "That change can't be undone." };
  const ctx = await staffFor(entry.universityId);
  if (!ctx) return NO_ACCESS;
  if (entry.undoneAt) return { status: "error", message: "That change was already undone." };

  return attempt(async () => {
    const latest = await db.editLog.findFirst({
      where: { entity: entry.entity, entityId: entry.entityId, undoneAt: null, action: { notIn: ["undo", "move"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (latest?.id !== entry.id) {
      return { status: "error", message: "Something newer changed this since. Undo that first." };
    }
    await db.$transaction(async (tx) => {
      await reverse(tx, entry);
      await tx.editLog.update({ where: { id: entry.id }, data: { undoneAt: new Date(), undoneById: ctx.user.id } });
      await logEdit(tx, ctx.user.id, {
        universityId: entry.universityId,
        entity: entry.entity as "university",
        entityId: entry.entityId,
        action: "undo",
        summary: `Undid: ${entry.summary}`,
      });
    });
    published(entry.universityId!);
    return { status: "saved", message: "Undone." };
  });
}
