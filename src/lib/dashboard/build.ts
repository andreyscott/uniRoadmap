/**
 * Turns a user's raw rows (progress, saved roadmaps) plus the content files into what the
 * dashboard shows. Pure, so it's tested without a database.
 */
import type { LineColor, NodeType } from "@/lib/content/constants";
import type { Roadmap } from "@/lib/content/schemas";
import { summariseProgress, type ProgressMap, type ProgressStatus, type ProgressSummary } from "@/lib/progress/status";

/** A roadmap as the dashboard needs it, from either a course or a skill roadmap. */
export interface RoadmapRef {
  id: string;
  kind: "course" | "skill";
  title: string;
  href: string;
  color: LineColor;
  roadmap: Roadmap;
}

export interface ProgressRow {
  nodeId: string;
  status: ProgressStatus;
  updatedAt: Date;
}

export interface SavedRow {
  roadmapId: string;
  createdAt: Date;
}

export interface DashboardRoadmap {
  id: string;
  kind: "course" | "skill" | "university";
  title: string;
  href: string;
  color: LineColor;
  summary: ProgressSummary;
  saved: boolean;
  /** ISO time of the latest progress change or save. */
  lastActive: string;
  /** What to open next: the latest topic in progress, else the first topic not started. */
  next: { id: string; title: string; status: "in-progress" | null } | null;
}

export interface ActivityItem {
  nodeId: string;
  title: string;
  status: ProgressStatus;
  updatedAt: string;
  roadmapTitle: string;
  href: string;
}

export interface DashboardContent {
  roadmaps: DashboardRoadmap[];
  activity: ActivityItem[];
}

interface BuildInput {
  progress: ProgressRow[];
  saved: SavedRow[];
  findRoadmap: (id: string) => RoadmapRef | undefined;
  roadmapOfNode: (nodeId: string) => string | undefined;
  activityLimit?: number;
}

export function buildDashboard({ progress, saved, findRoadmap, roadmapOfNode, activityLimit = 8 }: BuildInput): DashboardContent {
  // Newest first, so the first row seen per roadmap or node is the latest.
  const rows = [...progress].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const byRoadmap = new Map<string, ProgressRow[]>();
  for (const row of rows) {
    const roadmapId = roadmapOfNode(row.nodeId);
    // Progress on a node that was removed from the content files: nothing to show it against.
    if (!roadmapId) continue;
    byRoadmap.set(roadmapId, [...(byRoadmap.get(roadmapId) ?? []), row]);
  }
  const savedAt = new Map(saved.map((s) => [s.roadmapId, s.createdAt]));

  const roadmaps: DashboardRoadmap[] = [];
  for (const id of new Set([...byRoadmap.keys(), ...savedAt.keys()])) {
    const ref = findRoadmap(id);
    if (!ref) continue;
    const roadmapRows = byRoadmap.get(id) ?? [];
    const map: ProgressMap = Object.fromEntries(roadmapRows.map((r) => [r.nodeId, r.status]));
    const times = [roadmapRows[0]?.updatedAt, savedAt.get(id)].filter((t): t is Date => t !== undefined);

    roadmaps.push({
      id,
      kind: ref.kind,
      title: ref.title,
      href: ref.href,
      color: ref.color,
      summary: summariseProgress(
        ref.roadmap.nodes.map((n) => n.id),
        map,
      ),
      saved: savedAt.has(id),
      lastActive: new Date(Math.max(...times.map((t) => t.getTime()))).toISOString(),
      next: nextTopic(ref.roadmap, roadmapRows, map),
    });
  }
  roadmaps.sort((a, b) => b.lastActive.localeCompare(a.lastActive));

  const activity: ActivityItem[] = [];
  for (const row of rows) {
    if (activity.length >= activityLimit) break;
    const ref = findRoadmap(roadmapOfNode(row.nodeId) ?? "");
    const node = ref?.roadmap.nodes.find((n) => n.id === row.nodeId);
    if (!ref || !node) continue;
    activity.push({
      nodeId: node.id,
      title: node.title,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
      roadmapTitle: ref.title,
      href: `${ref.href}#${node.id}`,
    });
  }

  return { roadmaps, activity };
}

/**
 * The most recently touched topic still in progress; otherwise the first topic (in stage
 * order) not started yet, preferring core topics; otherwise null (everything done or skipped).
 */
function nextTopic(roadmap: Roadmap, rowsNewestFirst: ProgressRow[], map: ProgressMap): DashboardRoadmap["next"] {
  const inProgress = rowsNewestFirst.find((r) => r.status === "in-progress");
  const byId = new Map(roadmap.nodes.map((n) => [n.id, n]));
  if (inProgress) {
    const node = byId.get(inProgress.nodeId);
    if (node) return { id: node.id, title: node.title, status: "in-progress" };
  }
  const ordered = [...roadmap.nodes].sort((a, b) => a.stage - b.stage);
  const unstarted = ordered.filter((n) => !map[n.id]);
  const pick = unstarted.find((n) => n.type === "core") ?? unstarted[0];
  return pick ? { id: pick.id, title: pick.title, status: null } : null;
}

export interface ModuleProgressRow {
  moduleId: string;
  universityCourseId: string;
  status: ProgressStatus;
  updatedAt: Date;
}

/** A university course as the dashboard needs it. Modules are in curriculum order. */
export interface UniversityCourseRef {
  id: string;
  title: string;
  href: string;
  color: LineColor;
  modules: { id: string; code: string; title: string; type: NodeType }[];
}

/** Dashboard entries and activity for progress on university curricula (module progress). */
export function buildUniversityDashboard(rows: ModuleProgressRow[], courses: UniversityCourseRef[]): DashboardContent {
  const newestFirst = [...rows].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const byId = new Map(courses.map((c) => [c.id, c]));

  const roadmaps: DashboardRoadmap[] = courses.flatMap((course) => {
    const courseRows = newestFirst.filter((r) => r.universityCourseId === course.id);
    if (courseRows.length === 0) return [];
    const map: ProgressMap = Object.fromEntries(courseRows.map((r) => [r.moduleId, r.status]));
    const label = (m: { code: string; title: string }) => `${m.code} ${m.title}`;
    const inProgress = courseRows.find((r) => r.status === "in-progress");
    const inProgressModule = inProgress && course.modules.find((m) => m.id === inProgress.moduleId);
    const unstarted = course.modules.filter((m) => !map[m.id]);
    const nextModule = unstarted.find((m) => m.type === "core") ?? unstarted[0];
    return [
      {
        id: course.id,
        kind: "university" as const,
        title: course.title,
        href: course.href,
        color: course.color,
        summary: summariseProgress(
          course.modules.map((m) => m.id),
          map,
        ),
        saved: false,
        lastActive: courseRows[0].updatedAt.toISOString(),
        next: inProgressModule
          ? { id: inProgressModule.id, title: label(inProgressModule), status: "in-progress" as const }
          : nextModule
            ? { id: nextModule.id, title: label(nextModule), status: null }
            : null,
      },
    ];
  });

  const activity: ActivityItem[] = newestFirst.flatMap((row) => {
    const course = byId.get(row.universityCourseId);
    const mod = course?.modules.find((m) => m.id === row.moduleId);
    if (!course || !mod) return [];
    return [
      {
        nodeId: mod.id,
        title: `${mod.code} ${mod.title}`,
        status: row.status,
        updatedAt: row.updatedAt.toISOString(),
        roadmapTitle: course.title,
        href: `${course.href}#${mod.id}`,
      },
    ];
  });

  return { roadmaps, activity };
}
