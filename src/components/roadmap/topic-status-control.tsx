import Link from "next/link";
import { CheckIcon, ClockIcon, SkipForwardIcon, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProgressStatus } from "@/lib/progress/status";
import type { ProgressPhase } from "./use-roadmap-progress";

const OPTIONS: { value: ProgressStatus; label: string; icon: LucideIcon }[] = [
  { value: "done", label: "Done", icon: CheckIcon },
  { value: "in-progress", label: "In progress", icon: ClockIcon },
  { value: "skipped", label: "Skip", icon: SkipForwardIcon },
];

interface TopicStatusControlProps {
  phase: ProgressPhase;
  status: ProgressStatus | null;
  onChange: (status: ProgressStatus | null) => void;
  loginHref: string;
  saveError: { message: string; signedOut: boolean } | null;
}

/** Done / In progress / Skip toggles for one topic. Pressing the active one clears it. */
export function TopicStatusControl({ phase, status, onChange, loginHref, saveError }: TopicStatusControlProps) {
  if (phase === "unavailable") return null;

  if (phase === "signed-out") {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        <Link href={loginHref} className="font-medium text-primary underline underline-offset-4">
          Sign in
        </Link>{" "}
        to track your progress on this topic.
      </p>
    );
  }

  if (phase === "error") {
    return <p className="mt-4 text-sm text-muted-foreground">Progress tracking isn&apos;t available right now.</p>;
  }

  return (
    <div className="mt-4">
      <div role="group" aria-label="Your progress on this topic" className="flex flex-wrap gap-2">
        {OPTIONS.map(({ value, label, icon: Icon }) => {
          const active = status === value;
          return (
            <Button
              key={value}
              type="button"
              variant={active ? "default" : "outline"}
              aria-pressed={active}
              disabled={phase === "loading"}
              onClick={() => onChange(active ? null : value)}
              className="h-9 gap-1.5 px-3"
            >
              <Icon aria-hidden />
              {label}
            </Button>
          );
        })}
      </div>
      {saveError && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {saveError.message}{" "}
          {saveError.signedOut && (
            <Link href={loginHref} className="font-medium underline underline-offset-4">
              Sign in
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
