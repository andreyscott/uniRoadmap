import { Fragment } from "react";
import { cn } from "@/lib/utils";

/**
 * A tiny route line with one stop per year, so course lengths compare at a glance.
 * Decorative: always pair it with the length in text. Uses the --line colour of its parent.
 */
export function YearStrip({ years, className }: { years: number; className?: string }) {
  return (
    <span aria-hidden className={cn("flex items-center", className)}>
      {Array.from({ length: years }, (_, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="h-0.5 w-2.5 bg-(--line)" />}
          <span
            className={cn(
              "size-2 rounded-full border-2 border-(--line)",
              i === years - 1 ? "bg-(--line)" : "bg-background",
            )}
          />
        </Fragment>
      ))}
    </span>
  );
}
