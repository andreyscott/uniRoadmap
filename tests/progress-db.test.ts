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

  it("keeps users' progress separate", async () => {
    const other = { id: "00000000-0000-4000-8000-000000000002", email: "progress-test-2@example.com" };
    try {
      expect(await db.getRoadmapProgress(other, "computer-science")).toEqual({});
    } finally {
      await getDb().user.deleteMany({ where: { id: other.id } });
    }
  });
});
