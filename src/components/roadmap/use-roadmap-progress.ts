"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { setRoadmapSaved } from "@/lib/dashboard/actions";
import { setTopicStatus } from "@/lib/progress/actions";
import type { ProgressMap, ProgressStatus } from "@/lib/progress/status";

export type ProgressPhase =
  /** Sign-in isn't configured, so there's no progress to show. */
  | "unavailable"
  | "signed-out"
  | "loading"
  | "ready"
  /** Signed in, but progress couldn't be loaded (e.g. database down). */
  | "error";

type Loaded = { key: string; progress: ProgressMap; saved: boolean } | { key: string; error: string };
/** Where a failed change came from, so each control shows only its own errors. */
export type SaveError = { source: "topic" | "saved"; message: string; signedOut: boolean } | null;

/**
 * The signed-in user's progress on one roadmap (and whether it's saved to their dashboard),
 * loaded in the browser so the page itself stays prerendered. Changes apply instantly and
 * roll back if saving fails.
 */
export function useRoadmapProgress(roadmapId: string) {
  const auth = useAuth();
  // Results are tagged with who and what they were loaded for, so a different user or roadmap
  // never sees stale data, without resetting state in an effect.
  const key = auth.status === "signed-in" ? `${auth.user.id}:${roadmapId}` : null;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [saveError, setSaveError] = useState<SaveError>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    fetch(`/api/progress?roadmap=${encodeURIComponent(roadmapId)}`, { cache: "no-store" })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as { progress?: ProgressMap; saved?: boolean; error?: string };
        if (!res.ok || !body.progress) throw new Error(body.error ?? "Your progress couldn't be loaded.");
        return { progress: body.progress, saved: Boolean(body.saved) };
      })
      .then((data) => !cancelled && setLoaded({ key, ...data }))
      .catch((err: Error) => !cancelled && setLoaded({ key, error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [key, roadmapId]);

  const current = loaded && loaded.key === key ? loaded : null;
  const phase: ProgressPhase =
    auth.status === "unavailable"
      ? "unavailable"
      : auth.status === "signed-out"
        ? "signed-out"
        : auth.status === "loading" || !current
          ? "loading"
          : "error" in current
            ? "error"
            : "ready";
  const ready = current && "progress" in current ? current : null;
  const progress: ProgressMap = ready?.progress ?? {};
  const saved = ready?.saved ?? false;

  /** Applies a change to the loaded data, if it's still for the same user and roadmap. */
  const patch = (change: (data: { progress: ProgressMap; saved: boolean }) => Partial<{ progress: ProgressMap; saved: boolean }>) =>
    setLoaded((prev) => (prev && prev.key === key && "progress" in prev ? { ...prev, ...change(prev) } : prev));

  const run = async (
    source: "topic" | "saved",
    apply: () => void,
    undo: () => void,
    save: () => Promise<{ ok: boolean; error?: string; signedOut?: boolean }>,
  ) => {
    if (phase !== "ready") return;
    apply();
    setSaveError(null);
    const result = await save();
    if (!result.ok) {
      undo();
      setSaveError({ source, message: result.error ?? "That couldn't be saved.", signedOut: Boolean(result.signedOut) });
    }
  };

  const setStatus = (nodeId: string, status: ProgressStatus | null) => {
    const previous = progress[nodeId];
    const set = (value: ProgressStatus | undefined) => patch((d) => ({ progress: { ...d.progress, [nodeId]: value } }));
    return run(
      "topic",
      () => set(status ?? undefined),
      () => set(previous),
      () => setTopicStatus(nodeId, status),
    );
  };

  const setSaved = (value: boolean) =>
    run(
      "saved",
      () => patch(() => ({ saved: value })),
      () => patch(() => ({ saved: !value })),
      () => setRoadmapSaved(roadmapId, value),
    );

  return { phase, progress, saved, setStatus, setSaved, saveError };
}
