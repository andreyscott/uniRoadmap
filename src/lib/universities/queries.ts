import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { NodeType, Ownership, Semester } from "@/lib/content/constants";
import { getDb } from "@/lib/db";
import { UNIVERSITIES_TAG, universityTag } from "./tags";

/*
 * Public reads of university data, cached until an admin edit expires their tags (see
 * lib/admin/actions.ts). Callers reach these at request time (after params or connection()),
 * so builds never need the database.
 */

const lower = <T extends string>(value: string) => value.toLowerCase().replaceAll("_", "-") as T;

export interface UniversitySummary {
  id: string;
  name: string;
  shortName: string;
  city: string;
  state: string;
  ownership: Ownership;
  /** Courses with a university version. */
  courseIds: string[];
}

export async function getUniversityList(): Promise<UniversitySummary[]> {
  "use cache";
  cacheTag(UNIVERSITIES_TAG);
  cacheLife("max");
  const rows = await getDb().university.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, shortName: true, city: true, state: true, ownership: true, courses: { select: { courseId: true } } },
  });
  return rows.map(({ courses, ownership, ...u }) => ({
    ...u,
    ownership: lower<Ownership>(ownership),
    courseIds: courses.map((c) => c.courseId),
  }));
}

export async function getUniversityPublic(id: string) {
  "use cache";
  cacheTag(universityTag(id));
  cacheLife("max");
  const uni = await getDb().university.findUnique({
    where: { id },
    include: {
      courses: {
        orderBy: { course: { name: "asc" } },
        select: { courseId: true, department: true, _count: { select: { modules: true } } },
      },
    },
  });
  return uni && { ...uni, ownership: lower<Ownership>(uni.ownership) };
}

export interface PublicModule {
  id: string;
  code: string;
  title: string;
  year: number;
  semester: Semester | null;
  creditUnits: number | null;
  type: NodeType;
  description: string | null;
  topicId: string | null;
}

export async function getUniversityCoursePublic(universityId: string, courseId: string) {
  "use cache";
  cacheTag(universityTag(universityId));
  cacheLife("max");
  const uc = await getDb().universityCourse.findUnique({
    where: { universityId_courseId: { universityId, courseId } },
    include: {
      university: { select: { id: true, name: true, shortName: true, city: true, state: true } },
      modules: { orderBy: [{ year: "asc" }, { semester: { sort: "asc", nulls: "last" } }, { position: "asc" }] },
    },
  });
  if (!uc) return null;
  const modules: PublicModule[] = uc.modules.map((m) => ({
    id: m.id,
    code: m.code,
    title: m.title,
    year: m.year,
    semester: m.semester ? lower<Semester>(m.semester) : null,
    creditUnits: m.creditUnits,
    type: lower<NodeType>(m.type),
    description: m.description,
    topicId: m.topicId,
  }));
  return { ...uc, modules };
}

/** Universities offering a course, for "Offered at" on the general course page. */
export async function getCourseOfferings(courseId: string) {
  "use cache";
  cacheTag(UNIVERSITIES_TAG);
  cacheLife("max");
  const rows = await getDb().universityCourse.findMany({
    where: { courseId },
    orderBy: { university: { shortName: "asc" } },
    select: { university: { select: { id: true, name: true, shortName: true } }, _count: { select: { modules: true } } },
  });
  return rows.map((r) => ({ ...r.university, hasCurriculum: r._count.modules > 0 }));
}
