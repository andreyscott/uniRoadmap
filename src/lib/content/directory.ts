/**
 * Course directory: the slim listing sent to the browser, and the pure functions that read
 * filters from the URL and apply them. No fs or zod imports, because the client uses this.
 */
import {
  DIFFICULTIES,
  EXAM_IDS,
  SUBJECTS,
  type Difficulty,
  type ExamId,
  type LineColor,
  type SubjectId,
} from "./constants";
import type { Course, Faculty } from "./schemas";

export interface CourseListing {
  id: string;
  name: string;
  summary: string;
  faculty: { id: string; name: string; color: LineColor };
  difficulty: Difficulty;
  durationYears: number;
  /** Number of roadmap topics, or null while the roadmap is still being written. */
  topicCount: number | null;
  careers: { id: string; title: string }[];
  entry: Partial<Record<ExamId, { subjects: string[]; required: SubjectId[] }>>;
  /** Normalised text for free-text search, from most to least important. */
  search: { name: string; main: string; topics: string };
}

export interface DirectoryFilters {
  q: string;
  faculties: string[];
  difficulties: Difficulty[];
  /** Career id (see careerId). */
  career: string | null;
  exam: ExamId | null;
  /** Only meaningful with an exam: subjects the student has for it. */
  subjects: SubjectId[];
  /** University id: only courses with a version at that university. */
  university: string | null;
}

export interface DirectoryOptions {
  faculties: { id: string; name: string; color: LineColor }[];
  careers: { id: string; title: string }[];
  /** For each exam, the subjects that at least one course requires (the only ones that can filter). */
  subjectsByExam: Partial<Record<ExamId, { id: SubjectId; label: string }[]>>;
}

export const EMPTY_FILTERS: DirectoryFilters = {
  q: "",
  faculties: [],
  difficulties: [],
  career: null,
  exam: null,
  subjects: [],
  university: null,
};

/** URL search param names. */
const PARAM = {
  q: "q",
  faculty: "faculty",
  difficulty: "difficulty",
  career: "career",
  exam: "exam",
  subject: "subject",
  university: "university",
} as const;

/** Lowercase with accents removed, so "café" matches "cafe". */
export function normalise(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Stable URL id for a career title, e.g. "Data scientist or ML engineer" -> "data-scientist-or-ml-engineer". */
export function careerId(title: string): string {
  return normalise(title)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function toListing(course: Course, faculty: Faculty): CourseListing {
  const careers = course.careers.map((c) => ({ id: careerId(c.title), title: c.title }));
  const entry: CourseListing["entry"] = {};
  for (const req of course.entryRequirements) {
    entry[req.exam] = { subjects: req.subjects, required: req.required };
  }
  return {
    id: course.id,
    name: course.name,
    summary: course.summary,
    faculty: { id: faculty.id, name: faculty.name, color: faculty.color },
    difficulty: course.difficulty,
    durationYears: course.durationYears,
    topicCount: course.roadmap?.nodes.length ?? null,
    careers,
    entry,
    search: {
      name: normalise(course.name),
      main: normalise([course.summary, faculty.name, ...careers.map((c) => c.title)].join(" ")),
      topics: normalise((course.roadmap?.nodes ?? []).map((n) => n.title).join(" ")),
    },
  };
}

export function directoryOptions(listings: CourseListing[], faculties: Faculty[]): DirectoryOptions {
  const careers = new Map<string, string>();
  for (const listing of listings) for (const c of listing.careers) careers.set(c.id, c.title);

  const subjectsByExam: DirectoryOptions["subjectsByExam"] = {};
  for (const exam of EXAM_IDS) {
    const required = new Set(listings.flatMap((l) => l.entry[exam]?.required ?? []));
    if (listings.some((l) => l.entry[exam])) {
      // Keep the SUBJECTS order (English, Maths, sciences, ...), which reads better than A-Z.
      subjectsByExam[exam] = (Object.keys(SUBJECTS) as SubjectId[])
        .filter((id) => required.has(id))
        .map((id) => ({ id, label: SUBJECTS[id] }));
    }
  }

  return {
    // Only faculties that have at least one course: an empty checkbox is a dead end.
    faculties: faculties
      .filter((f) => listings.some((l) => l.faculty.id === f.id))
      .map((f) => ({ id: f.id, name: f.name, color: f.color })),
    careers: [...careers].map(([id, title]) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title)),
    subjectsByExam,
  };
}

type ParamSource = Pick<URLSearchParams, "get" | "getAll">;

/** Reads filters from the URL, dropping any value the directory doesn't know about. */
export function parseFilters(params: ParamSource, options: DirectoryOptions): DirectoryFilters {
  const known = <T extends string>(values: string[], allowed: readonly T[]) =>
    [...new Set(values)].filter((v): v is T => (allowed as readonly string[]).includes(v));

  const examParam = params.get(PARAM.exam);
  const exam = examParam && examParam in options.subjectsByExam ? (examParam as ExamId) : null;
  const career = params.get(PARAM.career);
  // Checked against the loaded university list by the view; here just shape-checked.
  const university = params.get(PARAM.university);

  return {
    q: (params.get(PARAM.q) ?? "").trim(),
    faculties: known(params.getAll(PARAM.faculty), options.faculties.map((f) => f.id)),
    difficulties: known(params.getAll(PARAM.difficulty), DIFFICULTIES),
    career: career && options.careers.some((c) => c.id === career) ? career : null,
    exam,
    subjects: exam
      ? known(params.getAll(PARAM.subject), (options.subjectsByExam[exam] ?? []).map((s) => s.id))
      : [],
    university: university && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(university) ? university : null,
  };
}

/** The query string for a set of filters (no leading "?"), or "" when nothing is set. */
export function filtersToQuery(filters: DirectoryFilters): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set(PARAM.q, filters.q.trim());
  for (const f of filters.faculties) params.append(PARAM.faculty, f);
  for (const d of filters.difficulties) params.append(PARAM.difficulty, d);
  if (filters.career) params.set(PARAM.career, filters.career);
  if (filters.exam) {
    params.set(PARAM.exam, filters.exam);
    for (const s of filters.subjects) params.append(PARAM.subject, s);
  }
  if (filters.university) params.set(PARAM.university, filters.university);
  return params.toString();
}

/** Number of active filters, for the mobile "Filters (n)" button. Search text doesn't count. */
export function countActiveFilters(filters: DirectoryFilters): number {
  return (
    filters.faculties.length +
    filters.difficulties.length +
    (filters.career ? 1 : 0) +
    (filters.exam ? 1 : 0) +
    filters.subjects.length +
    (filters.university ? 1 : 0)
  );
}

/**
 * Search score for a listing, or 0 if it doesn't match. Every word must appear somewhere;
 * each word scores by the best field it appears in (name 3, summary/faculty/careers 2, topics 1),
 * so "anatomy" finds Medicine through its topics but ranks name matches first.
 */
export function searchScore(listing: CourseListing, query: string): number {
  const words = normalise(query).split(/\s+/).filter(Boolean);
  let score = 0;
  for (const word of words) {
    const best = listing.search.name.includes(word)
      ? 3
      : listing.search.main.includes(word)
        ? 2
        : listing.search.topics.includes(word)
          ? 1
          : 0;
    if (best === 0) return 0;
    score += best;
  }
  return score;
}

/**
 * Applies every filter. Results are A-Z, or by search score (then A-Z) when there's a query.
 * `offered` is the set of course ids the chosen university has versions of; until it has
 * loaded, the university filter is skipped rather than showing nothing.
 */
export function filterCourses(listings: CourseListing[], filters: DirectoryFilters, offered?: Set<string>): CourseListing[] {
  const results: { listing: CourseListing; score: number }[] = [];

  for (const listing of listings) {
    if (filters.faculties.length && !filters.faculties.includes(listing.faculty.id)) continue;
    if (filters.difficulties.length && !filters.difficulties.includes(listing.difficulty)) continue;
    if (filters.career && !listing.careers.some((c) => c.id === filters.career)) continue;
    if (filters.university && offered && !offered.has(listing.id)) continue;
    if (filters.exam) {
      const entry = listing.entry[filters.exam];
      if (!entry) continue;
      // With subjects ticked, the student must have every subject the course requires.
      if (filters.subjects.length && !entry.required.every((s) => filters.subjects.includes(s))) continue;
    }
    const score = filters.q ? searchScore(listing, filters.q) : 0;
    if (filters.q && score === 0) continue;
    results.push({ listing, score });
  }

  return results
    .sort((a, b) => b.score - a.score || a.listing.name.localeCompare(b.listing.name))
    .map((r) => r.listing);
}
