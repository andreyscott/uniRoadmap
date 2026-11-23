import { describe, expect, it } from "vitest";
import type { Tag } from "@/lib/content/constants";
import { getCourses, getFaculty, loadQuiz } from "@/lib/content/load";
import { quizFileSchema } from "@/lib/content/schemas";
import {
  answersFromParams,
  answersToQuery,
  buildProfile,
  cleanAnswers,
  isComplete,
  rankCourses,
  scoreCourse,
  toQuizCourse,
  type Answers,
} from "@/lib/quiz/scoring";

const { questions } = loadQuiz();
const courses = getCourses().map((c) => toQuizCourse(c, getFaculty(c.faculty)!));
const top = (answers: Answers, n = 3) =>
  rankCourses(courses, buildProfile(questions, answers))
    .slice(0, n)
    .map((m) => m.course.id);

// Personas: complete, realistic answer sets. If content changes break these, the quiz has
// stopped recommending sensibly, not just changed.
const FUTURE_DOCTOR: Answers = {
  exam: ["nigeria"],
  subjects: ["biology", "chemistry", "physics"],
  problems: ["illness"],
  weekend: ["outreach"],
  setting: ["hospital"],
  teamwork: ["team"],
  strengths: ["details", "people"],
  goals: ["impact", "security"],
  length: ["any"],
  challenge: ["tough"],
};
const TECHIE: Answers = {
  exam: ["alevels"],
  subjects: ["maths", "computing", "physics"],
  problems: ["puzzle"],
  weekend: ["app"],
  setting: ["laptop"],
  teamwork: ["mostly-alone"],
  strengths: ["numbers", "ideas"],
  goals: ["salary", "abroad"],
  length: ["four"],
  challenge: ["tough"],
};
const WRITER: Answers = {
  exam: ["nigeria"],
  subjects: ["english", "humanities", "art"],
  problems: ["story"],
  weekend: ["media"],
  setting: ["out-and-about"],
  teamwork: ["team"],
  strengths: ["explaining", "ideas"],
  goals: ["impact", "own-boss"],
  length: ["four"],
  challenge: ["manageable"],
};
const BUSINESS: Answers = {
  exam: ["us"],
  subjects: ["economics", "accounting", "maths"],
  problems: ["business"],
  weekend: ["shop"],
  setting: ["office"],
  teamwork: ["lead"],
  strengths: ["organising", "numbers"],
  goals: ["salary", "own-boss"],
  length: ["four"],
  challenge: ["balanced"],
};

describe("quiz content", () => {
  it("has 8-12 valid questions", () => {
    expect(quizFileSchema.safeParse({ questions }).success).toBe(true);
    expect(questions.length).toBeGreaterThanOrEqual(8);
    expect(questions.length).toBeLessThanOrEqual(12);
  });

  it("can express every tag a course depends on heavily", () => {
    const reachable = new Set(questions.flatMap((q) => q.options.flatMap((o) => Object.keys(o.weights ?? {}))));
    for (const course of courses) {
      for (const [tag, weight] of Object.entries(course.tags) as [Tag, number][]) {
        if (weight >= 3) expect(reachable.has(tag), `${course.id}: ${tag}`).toBe(true);
      }
    }
  });

  it("uses complete persona answers in these tests", () => {
    for (const persona of [FUTURE_DOCTOR, TECHIE, WRITER, BUSINESS]) {
      expect(isComplete(questions, cleanAnswers(questions, persona))).toBe(true);
    }
  });
});

describe("answers", () => {
  it("round-trips through the URL", () => {
    const query = answersToQuery(TECHIE);
    expect(answersFromParams(questions, new URLSearchParams(query))).toEqual(TECHIE);
  });

  it("drops unknown ids and enforces single choice and max picks", () => {
    const cleaned = cleanAnswers(questions, {
      nope: ["x"],
      exam: ["nigeria", "alevels"],
      subjects: ["maths", "maths", "physics", "chemistry", "biology", "unknown"],
    });
    expect(cleaned).toEqual({ exam: ["nigeria"], subjects: ["maths", "physics", "chemistry"] });
    expect(isComplete(questions, cleaned)).toBe(false);
  });
});

describe("buildProfile", () => {
  it("adds weights and reads exam, length and difficulty answers", () => {
    const profile = buildProfile(questions, TECHIE);
    expect(profile.exam).toBe("alevel");
    expect(profile.maxYears).toBe(4);
    expect(profile.maxDifficulty).toBeNull();
    expect(profile.tags.technology).toBeGreaterThan(5);
    expect(profile.tags.clinical).toBeUndefined();
  });
});

describe("recommendations", () => {
  it("sends a future doctor to health courses", () => {
    expect(top(FUTURE_DOCTOR).every((id) => ["medicine-and-surgery", "nursing", "pharmacy"].includes(id))).toBe(true);
  });

  it("puts Computer Science first for a techie, with Electrical Engineering close", () => {
    const ranked = top(TECHIE);
    expect(ranked[0]).toBe("computer-science");
    expect(ranked).toContain("electrical-electronic-engineering");
  });

  it("puts Mass Communication first for a writer", () => {
    expect(top(WRITER)[0]).toBe("mass-communication");
  });

  it("keeps a business-minded student in the business faculty", () => {
    expect(top(BUSINESS).every((id) => ["business-administration", "accounting", "economics"].includes(id))).toBe(true);
  });

  it("explains each top match", () => {
    const [best] = rankCourses(courses, buildProfile(questions, FUTURE_DOCTOR));
    expect(best.reasons.length).toBeGreaterThan(0);
    expect(best.reasons.length).toBeLessThanOrEqual(3);
    expect(best.reasons.every((r) => r.endsWith("."))).toBe(true);
  });
});

describe("scoreCourse cautions", () => {
  const medicine = courses.find((c) => c.id === "medicine-and-surgery")!;

  it("ranks long and demanding courses lower when the student wants shorter, easier ones", () => {
    const relaxed = buildProfile(questions, { ...FUTURE_DOCTOR, length: ["any"], challenge: ["tough"] });
    const strict = buildProfile(questions, { ...FUTURE_DOCTOR, length: ["four"], challenge: ["manageable"] });
    const relaxedMatch = scoreCourse(medicine, relaxed);
    const strictMatch = scoreCourse(medicine, strict);
    expect(strictMatch.score).toBeLessThan(relaxedMatch.score);
    expect(strictMatch.cautions.join(" ")).toMatch(/6 years/);
    expect(strictMatch.cautions.join(" ")).toMatch(/advanced/);
  });

  it("warns when a course leans on a subject the student didn't pick", () => {
    const match = scoreCourse(medicine, buildProfile(questions, { ...FUTURE_DOCTOR, subjects: ["chemistry", "physics"] }));
    expect(match.cautions).toContain("It leans heavily on biology, which didn't come up much in your answers.");
  });
});
