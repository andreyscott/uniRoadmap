import "server-only";
import { getDb } from "@/lib/db";
import type { ProgressStatus as DbStatus } from "@/generated/prisma/enums";
import type { SessionUser } from "@/lib/supabase/server";
import type { ProgressMap, ProgressStatus } from "./status";

const TO_DB: Record<ProgressStatus, DbStatus> = { done: "DONE", "in-progress": "IN_PROGRESS", skipped: "SKIPPED" };
export const FROM_DB: Record<DbStatus, ProgressStatus> = { DONE: "done", IN_PROGRESS: "in-progress", SKIPPED: "skipped" };

/*
 * Data access for user data. Every function takes the verified session user, never an id
 * from the client, so one user can't read or change another's data.
 */

/** The users row mirrors the Supabase account; create it the first time someone saves anything. */
export async function ensureUserRow(user: SessionUser) {
  await getDb().user.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email ?? `${user.id}@users.invalid` },
    update: user.email ? { email: user.email } : {},
  });
}

export async function getRoadmapProgress(user: SessionUser, roadmapId: string): Promise<ProgressMap> {
  const rows = await getDb().userProgress.findMany({
    where: { userId: user.id, node: { roadmapId } },
    select: { nodeId: true, status: true },
  });
  return Object.fromEntries(rows.map((row) => [row.nodeId, FROM_DB[row.status]]));
}

export async function saveTopicStatus(user: SessionUser, nodeId: string, status: ProgressStatus | null) {
  const db = getDb();
  await ensureUserRow(user);
  if (status === null) {
    await db.userProgress.deleteMany({ where: { userId: user.id, nodeId } });
  } else {
    await db.userProgress.upsert({
      where: { userId_nodeId: { userId: user.id, nodeId } },
      create: { userId: user.id, nodeId, status: TO_DB[status] },
      update: { status: TO_DB[status] },
    });
  }
}

export async function isRoadmapSaved(user: SessionUser, roadmapId: string): Promise<boolean> {
  const row = await getDb().savedRoadmap.findUnique({
    where: { userId_roadmapId: { userId: user.id, roadmapId } },
    select: { roadmapId: true },
  });
  return row !== null;
}

/** Adds the roadmap to (or removes it from) the user's dashboard. */
export async function setRoadmapSaved(user: SessionUser, roadmapId: string, saved: boolean) {
  const db = getDb();
  if (saved) {
    await ensureUserRow(user);
    await db.savedRoadmap.upsert({
      where: { userId_roadmapId: { userId: user.id, roadmapId } },
      create: { userId: user.id, roadmapId },
      update: {},
    });
  } else {
    await db.savedRoadmap.deleteMany({ where: { userId: user.id, roadmapId } });
  }
}

/** Progress on a university course's modules, as { moduleId: status }. */
export async function getModuleProgress(user: SessionUser, universityCourseId: string): Promise<ProgressMap> {
  const rows = await getDb().moduleProgress.findMany({
    where: { userId: user.id, module: { universityCourseId } },
    select: { moduleId: true, status: true },
  });
  return Object.fromEntries(rows.map((row) => [row.moduleId, FROM_DB[row.status]]));
}

export async function saveModuleStatus(user: SessionUser, moduleId: string, status: ProgressStatus | null) {
  const db = getDb();
  await ensureUserRow(user);
  if (status === null) {
    await db.moduleProgress.deleteMany({ where: { userId: user.id, moduleId } });
  } else {
    await db.moduleProgress.upsert({
      where: { userId_moduleId: { userId: user.id, moduleId } },
      create: { userId: user.id, moduleId, status: TO_DB[status] },
      update: { status: TO_DB[status] },
    });
  }
}
