import type { CSSProperties, Ref } from "react";
import type { NodeType } from "@/lib/content/constants";
import type { ProgressStatus } from "@/lib/progress/status";
import { cn } from "@/lib/utils";

interface NodeStopProps {
  type: NodeType;
  /** Filled in with the line colour. */
  filled?: boolean;
  /** Progress: done fills the stop, in progress half-fills it, skipped fades it. */
  status?: ProgressStatus | null;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLSpanElement>;
}

/**
 * The stop marker for a topic. Shape carries the type as well as the card style, so it
 * doesn't rely on colour: circle = core, small circle = elective, diamond = optional skill.
 * Sizes are fixed (18 / 14 / 12px) because the viewer positions stops in pixels.
 */
export function NodeStop({ type, filled, status, className, style, ref }: NodeStopProps) {
  return (
    <span
      ref={ref}
      aria-hidden
      style={style}
      className={cn(
        "block shrink-0 border-(--line) transition-colors",
        type === "core" && "size-[18px] rounded-full border-[3px]",
        type === "elective" && "size-[14px] rounded-full border-[3px]",
        type === "optional-skill" && "size-[12px] rotate-45 rounded-[2px] border-[3px]",
        filled ? "bg-(--line)" : "bg-background",
        status === "done" && "border-status-done bg-status-done",
        status === "in-progress" &&
          "border-status-progress bg-[linear-gradient(to_top,var(--status-progress)_50%,var(--background)_50%)]",
        status === "skipped" && "opacity-40",
        className,
      )}
    />
  );
}

export const STOP_SIZE: Record<NodeType, number> = { core: 18, elective: 14, "optional-skill": 12 };
