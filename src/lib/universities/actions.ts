"use server";

import { getDb } from "@/lib/db";
import { ensureUserRow } from "@/lib/progress/db";
import { getSessionUser } from "@/lib/supabase/server";

export type MyUniversityResult = { ok: true } | { ok: false; error: string };

/** Sets (or with null, clears) the signed-in student's own university. */
export async function setMyUniversity(universityId: string | null): Promise<MyUniversityResult> {
  if (universityId !== null && (typeof universityId !== "string" || universityId.length > 60)) {
    return { ok: false, error: "That university doesn't exist." };
  }
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to choose your university." };

  try {
    const db = getDb();
    if (universityId && !(await db.university.findUnique({ where: { id: universityId }, select: { id: true } }))) {
      return { ok: false, error: "That university doesn't exist." };
    }
    await ensureUserRow(user);
    await db.user.update({ where: { id: user.id }, data: { universityId } });
    return { ok: true };
  } catch (err) {
    console.error("[universities] set my university failed:", err);
    return { ok: false, error: "That couldn't be saved. Try again in a moment." };
  }
}
