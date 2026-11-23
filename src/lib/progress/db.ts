import "server-only";
import { getDb } from "@/lib/db";
import type { ProgressStatus as DbStatus } from "@/generated/prisma/enums";
import type { SessionUser } from "@/lib/supabase/server";
import type { ProgressMap, ProgressStatus } from "./status";

const TO_DB: Record<ProgressStatus, DbStatus> = { done: "DONE", "in-progress": "IN_PROGRESS", skipped: "SKIPPED" };
const FROM_DB: Record<DbStatus, ProgressStatus> = { DONE: "done", IN_PROGRESS: "in-progress", SKIPPED: "skipped" };

/**
 * Data access for progress. Every function takes the verified session user, never an id
 * from the client, so one user can't read or change another's progress.
 */
export async function getRoadmapProgress(user: SessionUser, roadmapId: string): Promise<ProgressMap> {
  const rows = await getDb().userProgress.findMany({
    where: { userId: user.id, node: { roadmapId } },
    select: { nodeId: true, status: true },
  });
  return Object.fromEntries(rows.map((row) => [row.nodeId, FROM_DB[row.status]]));
}

export async function saveTopicStatus(user: SessionUser, nodeId: string, status: ProgressStatus | null) {
  const db = getDb();
  // The users row mirrors the Supabase account; create it the first time someone saves progress.
  await db.user.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email ?? `${user.id}@users.invalid` },
    update: user.email ? { email: user.email } : {},
  });
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
