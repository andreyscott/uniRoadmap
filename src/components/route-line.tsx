import type { CSSProperties } from "react";
import type { LineColor } from "@/lib/content/schemas";
import type { RouteStop } from "@/lib/content/views";
import { cn } from "@/lib/utils";

interface RouteLineProps {
  stops: RouteStop[];
  /** Faculty line colour (a --line-* token). */
  color: LineColor;
  /** Accessible name for the list, e.g. "Computer Science, year by year". */
  label: string;
  /**
   * Total grid columns. Lines of different lengths that share a value line up stage by stage,
   * so a 4-year line visibly stops short of a 6-year one. Defaults to the number of stops.
   */
  columns?: number;
  /**
   * "always": stop labels show at every width.
   * "from-sm": on phones only numbered stops show (labels stay readable by screen readers),
   * and the line uses its own stop count instead of `columns`.
   */
  labels?: "always" | "from-sm";
  className?: string;
}

/** The main text under a stop: the topic if there is one, otherwise the stage name. */
const PRIMARY_LABEL = "block text-[0.8125rem] leading-snug font-medium hyphens-auto lg:text-sm";

/**
 * A roadmap drawn as a transit line: a stop per stage, the last stop filled in as the terminus.
 * The stops are an ordered list, so assistive tech reads it as "Year 1: Programming…" etc.
 */
export function RouteLine({
  stops,
  color,
  label,
  columns = stops.length,
  labels = "always",
  className,
}: RouteLineProps) {
  const compact = labels === "from-sm";
  const style = {
    "--line": `var(--line-${color})`,
    "--stops": stops.length,
    "--cols": Math.max(columns, stops.length),
  } as CSSProperties;

  return (
    <ol
      aria-label={label}
      style={style}
      className={cn(
        "grid",
        compact
          ? "grid-cols-[repeat(var(--stops),minmax(0,1fr))] sm:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
          : "grid-cols-[repeat(var(--cols),minmax(0,1fr))]",
        className,
      )}
    >
      {stops.map((stop, i) => {
        const terminus = i === stops.length - 1;
        return (
          <li key={`${i}-${stop.name}`} className="relative min-w-0">
            {/* Track from this stop's centre to the next stop. Grid cells touch, so segments join up. */}
            {!terminus && (
              <span
                aria-hidden
                className="absolute top-2 right-0 left-2 h-1.5 -translate-y-1/2 bg-(--line)"
              />
            )}
            <span
              aria-hidden
              className={cn(
                "relative block size-4 rounded-full border-[3px] border-(--line)",
                terminus ? "bg-(--line)" : "bg-background",
              )}
            />

            {/* sr-only resets padding, so spacing lives on the inner span. */}
            <span className={cn("block", compact && "sr-only sm:not-sr-only")}>
              <span className="block pt-2 pr-3">
                {stop.topic ? (
                  <>
                    <span className="block text-xs text-muted-foreground">
                      {stop.name}
                      <span className="sr-only">: </span>
                    </span>
                    <span className={cn("mt-0.5", PRIMARY_LABEL)}>{stop.topic}</span>
                  </>
                ) : (
                  <span className={PRIMARY_LABEL}>{stop.name}</span>
                )}
              </span>
            </span>
            {compact && (
              <span aria-hidden className="block w-4 pt-1.5 text-center text-xs text-muted-foreground tabular-nums sm:hidden">
                {i + 1}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
