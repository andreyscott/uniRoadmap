import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ProgressSummary as Summary } from "@/lib/progress/status";
import type { ProgressPhase } from "./use-roadmap-progress";

interface ProgressSummaryProps {
  phase: ProgressPhase;
  summary: Summary;
  loginHref: string;
}

/** "Your progress" box above the roadmap: a bar when signed in, a prompt when not. */
export function ProgressSummary({ phase, summary, loginHref }: ProgressSummaryProps) {
  if (phase === "unavailable") return null;

  if (phase === "signed-out") {
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4">
        <div className="max-w-prose">
          <p className="font-heading font-bold">Track your progress</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to mark topics done, in progress or skipped, and see how far through the roadmap you are.
          </p>
        </div>
        <Button asChild variant="outline" className="h-10 px-4">
          <Link href={loginHref}>Sign in</Link>
        </Button>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <p className="mb-6 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        Your progress couldn&apos;t be loaded right now. The roadmap still works; try again later.
      </p>
    );
  }

  const loading = phase === "loading";
  return (
    <div aria-busy={loading} className="mb-6 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-heading font-bold">Your progress</p>
        {!loading && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {summary.done} of {summary.counted}
            </span>{" "}
            topics done
          </p>
        )}
      </div>
      <div
        role="progressbar"
        aria-label="Roadmap progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={loading ? undefined : summary.percent}
        aria-valuetext={loading ? "Loading" : `${summary.percent}% done`}
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-status-done transition-[width] duration-500"
          style={{ width: loading ? "0%" : `${summary.percent}%` }}
        />
      </div>
      <p className="mt-2 flex min-h-5 flex-wrap gap-x-4 text-sm text-muted-foreground">
        {loading ? (
          "Loading your progress…"
        ) : (
          <>
            <span>{summary.percent}% complete</span>
            {summary.inProgress > 0 && <span>{summary.inProgress} in progress</span>}
            {summary.skipped > 0 && <span>{summary.skipped} skipped, not counted</span>}
          </>
        )}
      </p>
    </div>
  );
}
