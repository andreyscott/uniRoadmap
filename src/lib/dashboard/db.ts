import "server-only";
import type { NodeType } from "@/lib/content/constants";
import { findNodeRoadmap, getCourse, getFaculty, getRoadmapRef } from "@/lib/content/load";
import { getDb } from "@/lib/db";
import { FROM_DB } from "@/lib/progress/db";
import { answersToQuery, type Answers } from "@/lib/quiz/scoring";
import type { SessionUser } from "@/lib/supabase/server";
import { buildDashboard, buildUniversityDashboard, type DashboardContent, type UniversityCourseRef } from "./build";

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
  const [progress, saved, results, moduleRows] = await Promise.all([
    db.userProgress.findMany({ where: { userId: user.id }, select: { nodeId: true, status: true, updatedAt: true } }),
    db.savedRoadmap.findMany({ where: { userId: user.id }, select: { roadmapId: true, createdAt: true } }),
    db.quizResult.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 3 }),
    db.moduleProgress.findMany({
      where: { userId: user.id },
      select: { moduleId: true, status: true, updatedAt: true, module: { select: { universityCourseId: true } } },
    }),
  ]);

  const university = await universityContent(
    moduleRows.map((r) => ({
      moduleId: r.moduleId,
      universityCourseId: r.module.universityCourseId,
      status: FROM_DB[r.status],
      updatedAt: r.updatedAt,
    })),
  );

  const general = buildDashboard({
    progress: progress.map((row) => ({ ...row, status: FROM_DB[row.status] })),
    saved,
    findRoadmap: getRoadmapRef,
    roadmapOfNode: findNodeRoadmap,
    activityLimit: 8,
  });

  const quizResults: SavedQuizResult[] = results.map((result) => ({
    id: result.id,
    createdAt: result.createdAt.toISOString(),
    href: `/quiz/results?${answersToQuery(result.answers as Answers)}`,
    courses: (result.topCourses as unknown as StoredTopCourse[]).flatMap(({ courseId }) => {
      const course = getCourse(courseId);
      return course ? [{ id: course.id, name: course.name, href: `/courses/${course.id}` }] : [];
    }),
  }));

  return {
    roadmaps: [...general.roadmaps, ...university.roadmaps].sort((a, b) => b.lastActive.localeCompare(a.lastActive)),
    activity: [...general.activity, ...university.activity].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8),
    quizResults,
  };
}

/** Roadmaps and activity from progress on university curricula. */
async function universityContent(rows: Parameters<typeof buildUniversityDashboard>[0]): Promise<DashboardContent> {
  if (rows.length === 0) return { roadmaps: [], activity: [] };
  const ucs = await getDb().universityCourse.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.universityCourseId))] } },
    include: {
      university: { select: { id: true, shortName: true } },
      modules: { orderBy: [{ year: "asc" }, { semester: { sort: "asc", nulls: "last" } }, { position: "asc" }] },
    },
  });
  const refs: UniversityCourseRef[] = ucs.flatMap((uc) => {
    const course = getCourse(uc.courseId);
    if (!course) return [];
    return [
      {
        id: uc.id,
        title: `${course.name} at ${uc.university.shortName}`,
        href: `/universities/${uc.university.id}/${uc.courseId}`,
        color: getFaculty(course.faculty)?.color ?? "engineering",
        modules: uc.modules.map((m) => ({
          id: m.id,
          code: m.code,
          title: m.title,
          type: m.type.toLowerCase().replace("_", "-") as NodeType,
        })),
      },
    ];
  });
  return buildUniversityDashboard(rows, refs);
}
