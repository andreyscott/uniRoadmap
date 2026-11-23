/** Progress on a topic. Client-safe. A topic with no status hasn't been started. */
export const PROGRESS_STATUSES = ["done", "in-progress", "skipped"] as const;
export type ProgressStatus = (typeof PROGRESS_STATUSES)[number];

/** Node id -> status, for one roadmap. */
export type ProgressMap = Partial<Record<string, ProgressStatus>>;

export const STATUS_LABELS: Record<ProgressStatus, string> = {
  done: "Done",
  "in-progress": "In progress",
  skipped: "Skipped",
};

export interface ProgressSummary {
  total: number;
  done: number;
  inProgress: number;
  skipped: number;
  /** Topics that count towards the percentage: everything except skipped ones. */
  counted: number;
  /** Whole-number percentage of counted topics that are done. */
  percent: number;
}

/**
 * Totals for a set of topics. Skipped topics don't count towards the percentage, so skipping
 * an elective you won't take doesn't hold your progress back.
 */
export function summariseProgress(nodeIds: string[], progress: ProgressMap): ProgressSummary {
  let done = 0;
  let inProgress = 0;
  let skipped = 0;
  for (const id of nodeIds) {
    const status = progress[id];
    if (status === "done") done++;
    else if (status === "in-progress") inProgress++;
    else if (status === "skipped") skipped++;
  }
  const counted = nodeIds.length - skipped;
  return {
    total: nodeIds.length,
    done,
    inProgress,
    skipped,
    counted,
    percent: counted > 0 ? Math.round((done / counted) * 100) : 0,
  };
}
