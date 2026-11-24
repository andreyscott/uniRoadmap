"use server";

import { z } from "zod";
import { findNodeRoadmap } from "@/lib/content/load";
import { getDb } from "@/lib/db";
import { saveModuleStatus, saveTopicStatus } from "@/lib/progress/db";
import { getSessionUser } from "@/lib/supabase/server";
import { PROGRESS_STATUSES, type ProgressStatus } from "./status";

export type SetStatusResult = { ok: true } | { ok: false; error: string; signedOut?: boolean };

const inputSchema = z.object({
  nodeId: z.string().min(1).max(120),
  status: z.enum(PROGRESS_STATUSES).nullable(),
});

/**
 * Sets (or with null, clears) the signed-in user's status for one topic. Server Actions are
 * public endpoints, so this validates its input and re-checks the session itself.
 */
export async function setTopicStatus(nodeId: string, status: ProgressStatus | null): Promise<SetStatusResult> {
  const input = inputSchema.safeParse({ nodeId, status });
  if (!input.success || !findNodeRoadmap(input.data.nodeId)) {
    return { ok: false, error: "That topic doesn't exist." };
  }

  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "You've been signed out. Sign in again to save your progress.", signedOut: true };
  }

  try {
    await saveTopicStatus(user, input.data.nodeId, input.data.status);
    return { ok: true };
  } catch (err) {
    console.error("[progress] save failed:", err);
    return { ok: false, error: "Your progress couldn't be saved. Try again in a moment." };
  }
}

/** Like setTopicStatus, for a module in a university's curriculum. */
export async function setModuleStatus(moduleId: string, status: ProgressStatus | null): Promise<SetStatusResult> {
  const input = inputSchema.safeParse({ nodeId: moduleId, status });
  if (!input.success) return { ok: false, error: "That module doesn't exist." };

  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "You've been signed out. Sign in again to save your progress.", signedOut: true };
  }

  try {
    const exists = await getDb().universityModule.findUnique({ where: { id: moduleId }, select: { id: true } });
    if (!exists) return { ok: false, error: "That module has been removed. Reload the page." };
    await saveModuleStatus(user, moduleId, input.data.status);
    return { ok: true };
  } catch (err) {
    console.error("[progress] module save failed:", err);
    return { ok: false, error: "Your progress couldn't be saved. Try again in a moment." };
  }
}
