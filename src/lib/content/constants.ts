/**
 * Plain constants shared by the content schemas and the UI. Kept free of zod so client
 * components can import them without pulling the validator into the browser bundle.
 */

/**
 * Shared vocabulary for matching students to courses. Courses declare how strongly each
 * tag describes them; quiz answers add weight to tags. Add new tags here first.
 */
export const TAGS = [
  // school subjects
  "maths",
  "physics",
  "chemistry",
  "biology",
  "economics",
  "technology",
  "writing",
  "languages",
  "art-design",
  "social-studies",
  // strengths and preferences
  "analytical",
  "problem-solving",
  "creative",
  "communication",
  "helping-people",
  "leadership",
  "detail-oriented",
  "hands-on",
  "research",
  "business-minded",
  "structured",
  // work settings
  "lab",
  "office",
  "clinical",
  "outdoors",
  "teamwork",
  "independent",
  // goals
  "high-earning",
  "job-security",
  "social-impact",
  "entrepreneurship",
  "global-mobility",
] as const;
export type Tag = (typeof TAGS)[number];

/** Line colour tokens defined in globals.css (--line-*). */
export const LINE_COLORS = ["engineering", "sciences", "health", "business", "arts", "skills"] as const;
export type LineColor = (typeof LINE_COLORS)[number];

export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/** Which exam or school system a set of entry requirements belongs to. */
export const EXAMS = {
  olevel: { label: "WAEC / NECO (O'Level)", region: "Nigeria" },
  utme: { label: "JAMB UTME", region: "Nigeria" },
  alevel: { label: "A-levels", region: "UK" },
  "us-highschool": { label: "High school", region: "US" },
} as const;
export type ExamId = keyof typeof EXAMS;
export const EXAM_IDS = Object.keys(EXAMS) as [ExamId, ...ExamId[]];

/**
 * School subjects that entry requirements can name as required. Exams use different names
 * for the same subject ("English Language", "Use of English"), so requirements point at these
 * ids and the exam's own wording stays in `subjects`.
 */
export const SUBJECTS = {
  english: "English",
  maths: "Mathematics",
  "further-maths": "Further Mathematics",
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
  "agricultural-science": "Agricultural Science",
  economics: "Economics",
  accounting: "Accounting",
  commerce: "Commerce",
  government: "Government",
  geography: "Geography",
  literature: "Literature in English",
  history: "History",
  "computer-science": "Computer Science",
} as const;
export type SubjectId = keyof typeof SUBJECTS;
export const SUBJECT_IDS = Object.keys(SUBJECTS) as [SubjectId, ...SubjectId[]];
