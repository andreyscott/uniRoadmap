/**
 * University data, undo and module progress against a real database. Skipped unless
 * TEST_DATABASE_URL points at a migrated, seeded database you don't mind writing to.
 * Uses a made-up "test-university" and removes it afterwards.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;
const UNI = "test-university";
const user = { id: "00000000-0000-4000-8000-0000000000aa", email: "university-test@example.com" };

describe.skipIf(!url)("universities, undo and module progress", () => {
  let getDb: Awaited<typeof import("@/lib/db")>["getDb"];
  let history: Awaited<typeof import("@/lib/admin/history")>;
  let progress: Awaited<typeof import("@/lib/progress/db")>;

  const cleanUp = async () => {
    await getDb().university.deleteMany({ where: { id: UNI } });
    await getDb().user.deleteMany({ where: { id: user.id } });
    await getDb().editLog.deleteMany({ where: { universityId: UNI } });
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    ({ getDb } = await import("@/lib/db"));
    history = await import("@/lib/admin/history");
    progress = await import("@/lib/progress/db");
    await cleanUp();
    await getDb().university.create({
      data: { id: UNI, name: "Test University", shortName: "TESTU", city: "Testville", state: "Lagos", ownership: "PRIVATE" },
    });
  });

  afterAll(async () => {
    await cleanUp();
    // Close the pool so test files don't pile up open connections on a small test database.
    await getDb().$disconnect();
  });

  it("reverses a module edit, a delete and a removed course with its modules", async () => {
    const db = getDb();
    const uc = await db.universityCourse.create({ data: { universityId: UNI, courseId: "computer-science", utmeSubjects: [] } });
    const original = await db.universityModule.create({
      data: { universityCourseId: uc.id, code: "TST 101", title: "Original title", year: 1, semester: "FIRST", creditUnits: 3 },
    });

    // Undo an update: the title comes back.
    await db.universityModule.update({ where: { id: original.id }, data: { title: "Changed title" } });
    await db.$transaction((tx) =>
      history.reverse(tx, { id: "e1", entity: "module", entityId: original.id, action: "update", before: history.snapshot(original) as never, after: null }),
    );
    expect((await db.universityModule.findUniqueOrThrow({ where: { id: original.id } })).title).toBe("Original title");

    // Undo removing the whole course: the course and its module come back with the same ids.
    const snapshot = history.snapshot(await db.universityCourse.findUniqueOrThrow({ where: { id: uc.id }, include: { modules: true } }));
    await db.universityCourse.delete({ where: { id: uc.id } });
    await db.$transaction((tx) =>
      history.reverse(tx, { id: "e2", entity: "universityCourse", entityId: uc.id, action: "delete", before: snapshot as never, after: null }),
    );
    expect(await db.universityModule.findUnique({ where: { id: original.id } })).not.toBeNull();

    // Undoing a course's creation is refused while it still has modules.
    await expect(
      db.$transaction((tx) => history.reverse(tx, { id: "e3", entity: "universityCourse", entityId: uc.id, action: "create", before: null, after: null })),
    ).rejects.toThrow("Remove them first");
  });

  it("stores module progress and shows it on the dashboard", async () => {
    const db = getDb();
    const uc = await db.universityCourse.findFirstOrThrow({ where: { universityId: UNI }, include: { modules: true } });
    const moduleId = uc.modules[0].id;

    await progress.saveModuleStatus(user, moduleId, "in-progress");
    expect(await progress.getModuleProgress(user, uc.id)).toEqual({ [moduleId]: "in-progress" });

    const { getDashboardData } = await import("@/lib/dashboard/db");
    const data = await getDashboardData(user);
    expect(data.roadmaps[0]).toMatchObject({
      kind: "university",
      title: "Computer Science at TESTU",
      href: `/universities/${UNI}/computer-science`,
      next: { id: moduleId, status: "in-progress" },
    });

    await progress.saveModuleStatus(user, moduleId, null);
    expect(await progress.getModuleProgress(user, uc.id)).toEqual({});
  });
});
