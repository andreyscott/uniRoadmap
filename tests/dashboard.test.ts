import { describe, expect, it } from "vitest";
import { buildDashboard, type ProgressRow, type RoadmapRef } from "@/lib/dashboard/build";
import { findNodeRoadmap, getCourse, getSkillRoadmap } from "@/lib/content/load";
import { formatRelative } from "@/lib/format";

const findRoadmap = (id: string): RoadmapRef | undefined => {
  const course = getCourse(id);
  if (course?.roadmap) {
    return { id, kind: "course", title: course.name, href: `/courses/${id}`, color: "engineering", roadmap: course.roadmap };
  }
  const skill = getSkillRoadmap(id);
  return skill ? { id, kind: "skill", title: skill.title, href: `/skills/${id}`, color: "skills", roadmap: skill.roadmap } : undefined;
};

const at = (minutesAgo: number) => new Date(Date.UTC(2026, 10, 20, 12, 0) - minutesAgo * 60_000);
const build = (progress: ProgressRow[], saved: { roadmapId: string; createdAt: Date }[] = []) =>
  buildDashboard({ progress, saved, findRoadmap, roadmapOfNode: findNodeRoadmap, activityLimit: 3 });

describe("buildDashboard", () => {
  it("is empty for a new user", () => {
    expect(build([])).toEqual({ roadmaps: [], activity: [] });
  });

  it("summarises each started roadmap, most recently active first", () => {
    const { roadmaps } = build([
      { nodeId: "cs-y1-intro-computing", status: "done", updatedAt: at(30) },
      { nodeId: "cs-y1-calculus", status: "skipped", updatedAt: at(20) },
      { nodeId: "ss-learning-how-to-learn", status: "done", updatedAt: at(5) },
    ]);
    expect(roadmaps.map((r) => r.id)).toEqual(["study-skills", "computer-science"]);
    const cs = roadmaps[1];
    expect(cs.summary).toMatchObject({ total: 27, done: 1, skipped: 1, counted: 26, percent: 4 });
    expect(cs.lastActive).toBe(at(20).toISOString());
    expect(cs.saved).toBe(false);
  });

  it("suggests the latest topic in progress, then the first core topic not started", () => {
    const withInProgress = build([
      { nodeId: "cs-y1-calculus", status: "in-progress", updatedAt: at(50) },
      { nodeId: "cs-y1-discrete-math", status: "in-progress", updatedAt: at(10) },
    ]).roadmaps[0];
    expect(withInProgress.next).toEqual({ id: "cs-y1-discrete-math", title: "Discrete Mathematics", status: "in-progress" });

    const fresh = build([{ nodeId: "cs-y1-intro-computing", status: "done", updatedAt: at(1) }]).roadmaps[0];
    expect(fresh.next).toEqual({ id: "cs-y1-programming-fundamentals", title: "Programming Fundamentals", status: null });
  });

  it("includes saved roadmaps with no progress yet", () => {
    const { roadmaps } = build([], [{ roadmapId: "exam-prep", createdAt: at(15) }]);
    expect(roadmaps).toHaveLength(1);
    expect(roadmaps[0]).toMatchObject({ id: "exam-prep", saved: true, summary: { done: 0, percent: 0 } });
    expect(roadmaps[0].next?.id).toBe("ep-know-the-exam");
  });

  it("ignores progress on topics or roadmaps that no longer exist", () => {
    const { roadmaps, activity } = build(
      [{ nodeId: "removed-node", status: "done", updatedAt: at(1) }],
      [{ roadmapId: "removed-roadmap", createdAt: at(1) }],
    );
    expect(roadmaps).toEqual([]);
    expect(activity).toEqual([]);
  });

  it("lists recent activity newest first, up to the limit", () => {
    const { activity } = build([
      { nodeId: "cs-y1-intro-computing", status: "done", updatedAt: at(40) },
      { nodeId: "cs-y1-calculus", status: "done", updatedAt: at(30) },
      { nodeId: "cs-y1-discrete-math", status: "in-progress", updatedAt: at(20) },
      { nodeId: "ss-active-recall", status: "skipped", updatedAt: at(10) },
    ]);
    expect(activity.map((a) => a.nodeId)).toEqual(["ss-active-recall", "cs-y1-discrete-math", "cs-y1-calculus"]);
    expect(activity[0]).toMatchObject({ roadmapTitle: "Study skills", href: "/skills/study-skills#ss-active-recall" });
  });
});

describe("formatRelative", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000).toISOString();

  it("rounds to the largest sensible unit", () => {
    expect(formatRelative(ago(20), now)).toBe("just now");
    expect(formatRelative(ago(5 * 60), now)).toBe("5 minutes ago");
    expect(formatRelative(ago(3 * 3600), now)).toBe("3 hours ago");
    expect(formatRelative(ago(26 * 3600), now)).toBe("yesterday");
    expect(formatRelative(ago(15 * 24 * 3600), now)).toBe("2 weeks ago");
    expect(formatRelative(ago(400 * 24 * 3600), now)).toBe("last year");
  });
});
