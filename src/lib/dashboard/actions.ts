"use server";

import { z } from "zod";
import { getCourses, getFaculty, getQuiz, roadmapExists } from "@/lib/content/load";
import { getDb } from "@/lib/db";
import { ensureUserRow, setRoadmapSaved as saveRoadmap } from "@/lib/progress/db";
import { buildProfile, cleanAnswers, isComplete, rankCourses, toQuizCourse, type Answers } from "@/lib/quiz/scoring";
import { getSessionUser } from "@/lib/supabase/server";
import type { StoredTopCourse } from "./db";

export type ActionResult = { ok: true } | { ok: false; error: string; signedOut?: boolean };

const SIGNED_OUT: ActionResult = {
  ok: false,
  error: "You've been signed out. Sign in again to save this.",
  signedOut: true,
};

/** Adds a roadmap to, or removes it from, the signed-in user's dashboard. */
export async function setRoadmapSaved(roadmapId: string, saved: boolean): Promise<ActionResult> {
  if (typeof roadmapId !== "string" || !roadmapExists(roadmapId) || typeof saved !== "boolean") {
    return { ok: false, error: "That roadmap doesn't exist." };
  }
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;

  try {
    await saveRoadmap(user, roadmapId, saved);
    return { ok: true };
  } catch (err) {
    console.error("[dashboard] save roadmap failed:", err);
    return { ok: false, error: "That couldn't be saved. Try again in a moment." };
  }
}

const answersSchema = z.record(z.string().max(60), z.array(z.string().max(60)).max(12));

/**
 * Saves course finder results to the signed-in user's dashboard. The ranking is recomputed
 * here from the answers rather than trusted from the browser. Saving the same answers twice
 * keeps a single copy.
 */
export async function saveQuizResult(rawAnswers: Answers): Promise<ActionResult> {
  const parsed = answersSchema.safeParse(rawAnswers);
  const { questions } = getQuiz();
  const answers = parsed.success ? cleanAnswers(questions, parsed.data) : {};
  if (!isComplete(questions, answers)) return { ok: false, error: "These answers are incomplete." };

  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;

  const courses = getCourses().map((course) => toQuizCourse(course, getFaculty(course.faculty)!));
  const topCourses: StoredTopCourse[] = rankCourses(courses, buildProfile(questions, answers))
    .slice(0, 3)
    .map((match) => ({ courseId: match.course.id, score: Math.round(match.score * 1000) / 1000, reasons: match.reasons }));

  try {
    const db = getDb();
    const existing = await db.quizResult.findFirst({
      where: { userId: user.id, answers: { equals: answers } },
      select: { id: true },
    });
    if (!existing) {
      await ensureUserRow(user);
      await db.quizResult.create({ data: { userId: user.id, answers, topCourses: topCourses as object[] } });
    }
    return { ok: true };
  } catch (err) {
    console.error("[dashboard] save quiz result failed:", err);
    return { ok: false, error: "Your results couldn't be saved. Try again in a moment." };
  }
}
