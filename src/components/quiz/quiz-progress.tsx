import { Fragment } from "react";
import { cn } from "@/lib/utils";

/** Quiz progress as a short route line: answered stops filled, the current one ringed. */
export function QuizProgress({ total, current }: { total: number; current: number }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Question {current + 1} of {total}
      </p>
      <div aria-hidden className="mt-2 flex items-center">
        {Array.from({ length: total }, (_, i) => (
          <Fragment key={i}>
            {i > 0 && <span className={cn("h-1 flex-1", i <= current ? "bg-primary" : "bg-border")} />}
            <span
              className={cn(
                "shrink-0 rounded-full border-[3px] transition-colors",
                i === current ? "size-4 border-primary bg-background ring-4 ring-primary/20" : "size-3",
                i < current && "border-primary bg-primary",
                i > current && "border-border bg-background",
              )}
            />
          </Fragment>
        ))}
      </div>
    </div>
  );
}
