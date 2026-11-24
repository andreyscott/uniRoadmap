/**
 * Runs the progress queries against a real database. Skipped unless TEST_DATABASE_URL points
 * at a migrated and seeded database you don't mind writing to, e.g. a local `npx prisma dev`.
 *
 *   TEST_DATABASE_URL=postgres://... npx vitest run tests/progress-db.test.ts
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;
const user = { id: "00000000-0000-4000-8000-000000000001", email: "progress-test@example.com" };

describe.skipIf(!url)("progress data access", () => {
  let db: Awaited<typeof import("@/lib/progress/db")>;
  let getDb: Awaited<typeof import("@/lib/db")>["getDb"];

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    db = await import("@/lib/progress/db");
    ({ getDb } = await import("@/lib/db"));
    await getDb().user.deleteMany({ where: { id: user.id } });
  });

  afterAll(async () => {
    // Deleting the user cascades to their progress.
    await getDb().user.deleteMany({ where: { id: user.id } });
    // Close the pool so test files don't pile up open connections on a small test database.
    await getDb().$disconnect();
  });

  it("creates the user on first save and reads progress back per roadmap", async () => {
    await db.saveTopicStatus(user, "cs-y1-calculus", "done");
    await db.saveTopicStatus(user, "cs-y1-discrete-math", "in-progress");
    await db.saveTopicStatus(user, "ss-active-recall", "skipped");

    expect(await db.getRoadmapProgress(user, "computer-science")).toEqual({
      "cs-y1-calculus": "done",
      "cs-y1-discrete-math": "in-progress",
    });
    expect(await db.getRoadmapProgress(user, "study-skills")).toEqual({ "ss-active-recall": "skipped" });
  });

  it("updates and clears a status", async () => {
    await db.saveTopicStatus(user, "cs-y1-calculus", "skipped");
    await db.saveTopicStatus(user, "cs-y1-discrete-math", null);
    expect(await db.getRoadmapProgress(user, "computer-science")).toEqual({ "cs-y1-calculus": "skipped" });
  });

  it("saves and unsaves roadmaps", async () => {
    await db.setRoadmapSaved(user, "exam-prep", true);
    await db.setRoadmapSaved(user, "exam-prep", true); // saving twice is harmless
    expect(await db.isRoadmapSaved(user, "exam-prep")).toBe(true);
    await db.setRoadmapSaved(user, "exam-prep", false);
    expect(await db.isRoadmapSaved(user, "exam-prep")).toBe(false);
  });

  it("builds the dashboard from progress, saves and quiz results", async () => {
    const { getDashboardData } = await import("@/lib/dashboard/db");
    await db.setRoadmapSaved(user, "research-basics", true);
    const answers = { exam: ["nigeria"], subjects: ["maths"] };
    await getDb().quizResult.create({
      data: { userId: user.id, answers, topCourses: [{ courseId: "computer-science", score: 0.9, reasons: [] }] },
    });

    const data = await getDashboardData(user);
    expect(data.roadmaps.map((r) => r.id).sort()).toEqual(["computer-science", "research-basics", "study-skills"]);
    expect(data.activity.length).toBeGreaterThan(0);
    expect(data.quizResults[0]).toMatchObject({
      href: "/quiz/results?exam=nigeria&subjects=maths",
      courses: [{ id: "computer-science", name: "Computer Science", href: "/courses/computer-science" }],
    });

    // The duplicate check used when saving quiz results: JSON equality on the answers.
    const same = await getDb().quizResult.findFirst({ where: { userId: user.id, answers: { equals: answers } } });
    const different = await getDb().quizResult.findFirst({
      where: { userId: user.id, answers: { equals: { exam: ["alevels"] } } },
    });
    expect(same).not.toBeNull();
    expect(different).toBeNull();
  });

  it("keeps users' progress separate", async () => {
    const other = { id: "00000000-0000-4000-8000-000000000002", email: "progress-test-2@example.com" };
    try {
      expect(await db.getRoadmapProgress(other, "computer-science")).toEqual({});
    } finally {
      await getDb().user.deleteMany({ where: { id: other.id } });
    }
  });
});
