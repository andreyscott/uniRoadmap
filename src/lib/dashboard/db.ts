import "server-only";
import { findNodeRoadmap, getCourse, getRoadmapRef } from "@/lib/content/load";
import { getDb } from "@/lib/db";
import { FROM_DB } from "@/lib/progress/db";
import { answersToQuery, type Answers } from "@/lib/quiz/scoring";
import type { SessionUser } from "@/lib/supabase/server";
import { buildDashboard, type DashboardContent } from "./build";

export interface SavedQuizResult {
  id: string;
  createdAt: string;
  /** Re-opens the full results from the saved answers. */
  href: string;
  courses: { id: string; name: string; href: string }[];
}

export interface DashboardData extends DashboardContent {
  quizResults: SavedQuizResult[];
}

/** Shape stored in quiz_results.topCourses. */
export interface StoredTopCourse {
  courseId: string;
  score: number;
  reasons: string[];
}

/** Everything on the signed-in user's dashboard, in one round trip to the database. */
export async function getDashboardData(user: SessionUser): Promise<DashboardData> {
  const db = getDb();
  const [progress, saved, results] = await Promise.all([
    db.userProgress.findMany({ where: { userId: user.id }, select: { nodeId: true, status: true, updatedAt: true } }),
    db.savedRoadmap.findMany({ where: { userId: user.id }, select: { roadmapId: true, createdAt: true } }),
    db.quizResult.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 3 }),
  ]);

  const content = buildDashboard({
    progress: progress.map((row) => ({ ...row, status: FROM_DB[row.status] })),
    saved,
    findRoadmap: getRoadmapRef,
    roadmapOfNode: findNodeRoadmap,
  });

  const quizResults = results.map((result) => ({
    id: result.id,
    createdAt: result.createdAt.toISOString(),
    href: `/quiz/results?${answersToQuery(result.answers as Answers)}`,
    courses: (result.topCourses as unknown as StoredTopCourse[]).flatMap(({ courseId }) => {
      const course = getCourse(courseId);
      return course ? [{ id: course.id, name: course.name, href: `/courses/${course.id}` }] : [];
    }),
  }));

  return { ...content, quizResults };
}
