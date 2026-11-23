/**
 * Course finder scoring. Pure and client-safe, so the quiz can run entirely in the browser.
 *
 * 1. Each answer adds tag weights to the student's profile (see content/quiz.json).
 * 2. Each course already has tag weights (its `tags`).
 * 3. The match is the cosine similarity of the two tag vectors: how closely the *shape* of the
 *    student's interests matches the course, regardless of how many answers they gave.
 * 4. Courses longer or harder than the student wants are scaled down, with a note saying why.
 */
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  type Difficulty,
  type ExamId,
  type LineColor,
  type Tag,
} from "@/lib/content/constants";
import type { Course, Faculty, QuizQuestion } from "@/lib/content/schemas";
import { SUBJECT_TAG_NAMES, TAG_REASONS } from "./reasons";

/** Question id -> chosen option ids. */
export type Answers = Record<string, string[]>;

/** The slice of a course the quiz needs, small enough to send to the browser. */
export interface QuizCourse {
  id: string;
  name: string;
  summary: string;
  faculty: { name: string; color: LineColor };
  durationYears: number;
  difficulty: Difficulty;
  tags: Partial<Record<Tag, number>>;
  careers: string[];
  /** Entry subjects for each exam, in the exam's own wording. */
  entry: Partial<Record<ExamId, string[]>>;
  hasRoadmap: boolean;
}

export function toQuizCourse(course: Course, faculty: Faculty): QuizCourse {
  const entry: QuizCourse["entry"] = {};
  for (const req of course.entryRequirements) entry[req.exam] = req.subjects;
  return {
    id: course.id,
    name: course.name,
    summary: course.summary,
    faculty: { name: faculty.name, color: faculty.color },
    durationYears: course.durationYears,
    difficulty: course.difficulty,
    tags: course.tags,
    careers: course.careers.map((c) => c.title),
    entry,
    hasRoadmap: Boolean(course.roadmap),
  };
}

export interface Profile {
  tags: Partial<Record<Tag, number>>;
  exam: ExamId | null;
  maxYears: number | null;
  maxDifficulty: Difficulty | null;
}

export interface Match {
  course: QuizCourse;
  /** 0-1 after any penalties. */
  score: number;
  /** "Why this fits you", strongest first (at most three). */
  reasons: string[];
  /** "Worth knowing": mismatches the student should weigh up. */
  cautions: string[];
}

/** Drops unknown questions and options, and enforces single choice and each question's max. */
export function cleanAnswers(questions: QuizQuestion[], raw: Answers): Answers {
  const answers: Answers = {};
  for (const question of questions) {
    const valid = [...new Set(raw[question.id] ?? [])].filter((id) => question.options.some((o) => o.id === id));
    const limit = question.kind === "single" ? 1 : (question.max ?? valid.length);
    if (valid.length) answers[question.id] = valid.slice(0, limit);
  }
  return answers;
}

/** True when every question has an answer. */
export function isComplete(questions: QuizQuestion[], answers: Answers): boolean {
  return questions.every((q) => (answers[q.id]?.length ?? 0) > 0);
}

/** Answers as a query string (question id = option id, repeated for multi-choice). */
export function answersToQuery(answers: Answers): string {
  const params = new URLSearchParams();
  for (const [questionId, optionIds] of Object.entries(answers)) {
    for (const optionId of optionIds) params.append(questionId, optionId);
  }
  return params.toString();
}

export function answersFromParams(questions: QuizQuestion[], params: Pick<URLSearchParams, "getAll">): Answers {
  return cleanAnswers(questions, Object.fromEntries(questions.map((q) => [q.id, params.getAll(q.id)])));
}

export function buildProfile(questions: QuizQuestion[], answers: Answers): Profile {
  const profile: Profile = { tags: {}, exam: null, maxYears: null, maxDifficulty: null };
  for (const question of questions) {
    for (const optionId of answers[question.id] ?? []) {
      const option = question.options.find((o) => o.id === optionId);
      if (!option) continue;
      for (const [tag, weight] of Object.entries(option.weights ?? {}) as [Tag, number][]) {
        profile.tags[tag] = (profile.tags[tag] ?? 0) + weight;
      }
      if (option.exam) profile.exam = option.exam;
      if (option.maxYears) profile.maxYears = option.maxYears;
      if (option.maxDifficulty) profile.maxDifficulty = option.maxDifficulty;
    }
  }
  return profile;
}

function cosine(a: Partial<Record<Tag, number>>, b: Partial<Record<Tag, number>>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [tag, value] of Object.entries(a) as [Tag, number][]) {
    normA += value * value;
    dot += value * (b[tag] ?? 0);
  }
  for (const value of Object.values(b) as number[]) normB += value * value;
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
}

const FAVOURITE_SUBJECT_WEIGHT = 3;
const DURATION_PENALTY = 0.8;
const DIFFICULTY_PENALTY_PER_LEVEL = 0.85;

export function scoreCourse(course: QuizCourse, profile: Profile): Match {
  let score = cosine(profile.tags, course.tags);
  const cautions: string[] = [];

  if (profile.maxYears && course.durationYears > profile.maxYears) {
    score *= DURATION_PENALTY;
    cautions.push(`It usually takes ${course.durationYears} years, longer than you said you'd like.`);
  }
  if (profile.maxDifficulty) {
    const over = DIFFICULTIES.indexOf(course.difficulty) - DIFFICULTIES.indexOf(profile.maxDifficulty);
    if (over > 0) {
      score *= DIFFICULTY_PENALTY_PER_LEVEL ** over;
      cautions.push(
        `It's rated ${DIFFICULTY_LABELS[course.difficulty].toLowerCase()}, more demanding than you said you wanted.`,
      );
    }
  }

  // Subjects the course leans on heavily that barely came up in the answers. Picking a
  // subject as a favourite adds 3, so anything under that means it wasn't a favourite.
  for (const [tag, name] of Object.entries(SUBJECT_TAG_NAMES) as [Tag, string][]) {
    if ((course.tags[tag] ?? 0) >= 3 && (profile.tags[tag] ?? 0) < FAVOURITE_SUBJECT_WEIGHT) {
      cautions.push(`It leans heavily on ${name}, which didn't come up much in your answers.`);
    }
  }

  // Reasons: the tags contributing most to the match, where the course weights them 2 or 3.
  const reasons = (Object.entries(profile.tags) as [Tag, number][])
    .filter(([tag]) => (course.tags[tag] ?? 0) >= 2)
    .map(([tag, value]) => ({ tag, contribution: value * (course.tags[tag] ?? 0) }))
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)
    .map(({ tag }) => `${TAG_REASONS[tag].you}, and ${TAG_REASONS[tag].course}.`);

  return { course, score, reasons, cautions };
}

/** Every course scored and sorted, best match first (ties broken alphabetically). */
export function rankCourses(courses: QuizCourse[], profile: Profile): Match[] {
  return courses
    .map((course) => scoreCourse(course, profile))
    .sort((a, b) => b.score - a.score || a.course.name.localeCompare(b.course.name));
}

/** A plain-language label for a match score. */
export function matchLabel(score: number): string {
  if (score >= 0.55) return "Strong match";
  if (score >= 0.4) return "Good match";
  return "Worth a look";
}
