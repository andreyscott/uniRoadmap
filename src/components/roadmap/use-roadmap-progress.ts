"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
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

type Loaded = { key: string; progress: ProgressMap } | { key: string; error: string };

/**
 * The signed-in user's progress on one roadmap, loaded in the browser (so the page itself stays
 * prerendered), with optimistic updates that roll back if saving fails.
 */
export function useRoadmapProgress(roadmapId: string) {
  const auth = useAuth();
  // Results are tagged with who and what they were loaded for, so a different user or roadmap
  // never sees stale data, without resetting state in an effect.
  const key = auth.status === "signed-in" ? `${auth.user.id}:${roadmapId}` : null;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [saveError, setSaveError] = useState<{ message: string; signedOut: boolean } | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    fetch(`/api/progress?roadmap=${encodeURIComponent(roadmapId)}`, { cache: "no-store" })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as { progress?: ProgressMap; error?: string };
        if (!res.ok || !body.progress) throw new Error(body.error ?? "Your progress couldn't be loaded.");
        return body.progress;
      })
      .then((progress) => !cancelled && setLoaded({ key, progress }))
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
  const progress: ProgressMap = current && "progress" in current ? current.progress : {};

  const setStatus = async (nodeId: string, status: ProgressStatus | null) => {
    if (phase !== "ready" || !key) return;
    const previous = progress[nodeId] ?? null;
    const apply = (value: ProgressStatus | null) =>
      setLoaded((prev) =>
        prev && prev.key === key && "progress" in prev
          ? { key, progress: { ...prev.progress, [nodeId]: value ?? undefined } }
          : prev,
      );

    apply(status);
    setSaveError(null);
    const result = await setTopicStatus(nodeId, status);
    if (!result.ok) {
      apply(previous);
      setSaveError({ message: result.error, signedOut: Boolean(result.signedOut) });
    }
  };

  return { phase, progress, setStatus, saveError };
}
