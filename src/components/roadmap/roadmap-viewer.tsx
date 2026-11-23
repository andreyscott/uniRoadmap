"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { usePathname } from "next/navigation";
import { CheckIcon } from "lucide-react";
import { NODE_TYPE_LABELS, type LineColor } from "@/lib/content/constants";
import { ancestorsOf, buildGraph, routeEdges } from "@/lib/content/roadmap-graph";
import type { Roadmap, RoadmapNode } from "@/lib/content/schemas";
import { STATUS_LABELS, summariseProgress, type ProgressMap, type ProgressStatus } from "@/lib/progress/status";
import { cn } from "@/lib/utils";
import { NodeDetails } from "./node-details";
import { NodeStop, STOP_SIZE } from "./node-stop";
import { ProgressSummary } from "./progress-summary";
import { RoadmapLegend } from "./roadmap-legend";
import { TopicStatusControl } from "./topic-status-control";
import { useRoadmapProgress } from "./use-roadmap-progress";

interface RoadmapViewerProps {
  /** Course or skill id; progress is stored against the roadmap's nodes. */
  roadmapId: string;
  roadmap: Roadmap;
  color: LineColor;
  /** Name of the last station, e.g. "Graduation". */
  terminus: string;
}

/*
 * Geometry, in px. The trunk line is centred at TRUNK_X. Core stops sit on it; electives and
 * optional skills branch off to BRANCH_X. Arcs between related topics bulge into the gutter
 * left of the trunk. Every row's stop is centred ROW_CENTER px below the row's top, matching
 * the 44px minimum card height.
 */
const TRUNK_X = 30;
const BRANCH_X = 54;
const ROW_CENTER = 22;
const STATION_SIZE = 26;

const DESKTOP_QUERY = "(min-width: 64rem)";
/** Fired after we change the hash with replaceState (which doesn't fire hashchange). */
const SELECT_EVENT = "roadmap:select";

function subscribeDesktop(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener(SELECT_EVENT, onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener(SELECT_EVENT, onChange);
  };
}

/**
 * The selected topic lives in the URL hash (#cs-y2-oop), so a topic can be linked to directly.
 * Rows carry the node id as their element id, so the browser also scrolls to it on load.
 */
function selectInUrl(id: string | null) {
  const { pathname, search } = window.location;
  window.history.replaceState(null, "", id ? `#${id}` : `${pathname}${search}`);
  window.dispatchEvent(new Event(SELECT_EVENT));
}

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface Arc {
  key: string;
  d: string;
  kind: "before" | "after";
}

/**
 * Interactive roadmap: stages as stations on a vertical line, topics as stops. Selecting a
 * topic opens its details (a sticky side panel on desktop, a bottom sheet on phones) and
 * lights up its route: what it builds on and what comes next.
 */
export function RoadmapViewer({ roadmapId, roadmap, color, terminus }: RoadmapViewerProps) {
  const graph = useMemo(() => buildGraph(roadmap), [roadmap]);
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");
  const hashId = decodeURIComponent(hash.slice(1));
  const selected = graph.byId.get(hashId) ?? null;

  const containerRef = useRef<HTMLDivElement>(null);
  const stopRefs = useRef(new Map<string, HTMLElement>());
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());
  const dialogRef = useRef<HTMLDialogElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const panelHeadingRef = useRef<HTMLHeadingElement>(null);
  const sheetHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusDetails = useRef(false);
  const panelHeadingId = useId();
  const sheetHeadingId = useId();

  const { phase, progress, saved, setStatus, setSaved, saveError } = useRoadmapProgress(roadmapId);
  const pathname = usePathname();
  const loginHref = (hash?: string) => `/login?next=${encodeURIComponent(pathname + (hash ? `#${hash}` : ""))}`;
  const showStatus = phase === "ready";
  const summary = summariseProgress(
    roadmap.nodes.map((n) => n.id),
    progress,
  );

  // Relation of each topic to the selected one, for highlighting.
  const relations = useMemo(() => {
    const map = new Map<string, "before" | "after">();
    if (!selected) return map;
    for (const node of ancestorsOf(graph, selected.id)) map.set(node.id, "before");
    for (const node of graph.children.get(selected.id) ?? []) map.set(node.id, "after");
    return map;
  }, [graph, selected]);

  // Route arcs are measured from the rendered stops. ResizeObserver calls back once when it
  // starts observing (before paint) and again whenever the layout width changes.
  const [arcs, setArcs] = useState<Arc[]>([]);
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !selected) return;
    const observer = new ResizeObserver(() => {
      const top = container.getBoundingClientRect().top;
      const centreY = (id: string) => {
        const rect = stopRefs.current.get(id)?.getBoundingClientRect();
        return rect ? rect.top - top + rect.height / 2 : null;
      };
      const x = TRUNK_X - STOP_SIZE.core / 2 - 1;
      const maxBulge = x - 2;
      const measured = routeEdges(graph, selected.id).flatMap((edge) => {
        const y1 = centreY(edge.from);
        const y2 = centreY(edge.to);
        return y1 === null || y2 === null ? [] : [{ ...edge, y1, y2 }];
      });
      // Arcs to several next topics start at the same point; give nearer ones a smaller bulge
      // so they nest instead of drawing on top of each other.
      const after = measured.filter((a) => a.kind === "after").sort((a, b) => b.y2 - a.y2);
      setArcs(
        measured.map((arc) => {
          const rank = arc.kind === "after" ? after.indexOf(arc) : 0;
          const bulge = Math.max(4, Math.min(maxBulge - rank * 5, 6 + Math.abs(arc.y2 - arc.y1) / 14));
          return {
            key: `${selected.id}:${arc.from}-${arc.to}`,
            kind: arc.kind,
            d: `M ${x} ${arc.y1} C ${x - bulge} ${arc.y1}, ${x - bulge} ${arc.y2}, ${x} ${arc.y2}`,
          };
        }),
      );
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [graph, selected]);

  // Open or close the phone bottom sheet, start each topic at the top of its panel, and move
  // focus to the details when asked to.
  useEffect(() => {
    const dialog = dialogRef.current;
    const asSheet = selected !== null && !isDesktop;
    if (dialog && asSheet && !dialog.open) dialog.showModal();
    if (dialog && !asSheet && dialog.open) dialog.close();
    if (dialog) dialog.scrollTop = 0;
    if (asideRef.current) asideRef.current.scrollTop = 0;
    if (selected && focusDetails.current) {
      focusDetails.current = false;
      (asSheet ? sheetHeadingRef : panelHeadingRef).current?.focus({ preventScroll: !asSheet });
    }
  }, [selected, isDesktop]);

  const select = (id: string, { scroll = false } = {}) => {
    focusDetails.current = true;
    selectInUrl(id);
    if (scroll && window.matchMedia(DESKTOP_QUERY).matches) {
      document.getElementById(id)?.scrollIntoView({
        block: "nearest",
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    }
  };

  const close = () => {
    const id = selected?.id;
    selectInUrl(null);
    if (id) buttonRefs.current.get(id)?.focus({ preventScroll: true });
  };

  const stageTitle = (node: RoadmapNode) =>
    graph.stages.find((s) => s.stage.stage === node.stage)?.stage.title ?? "";

  const selectFromDetails = (id: string) => select(id, { scroll: true });
  const parentOf = (node: RoadmapNode) => (node.parent ? (graph.byId.get(node.parent) ?? null) : null);
  const nextOf = (node: RoadmapNode) => graph.children.get(node.id) ?? [];
  const statusControl = (node: RoadmapNode) => (
    <TopicStatusControl
      phase={phase}
      status={progress[node.id] ?? null}
      onChange={(status) => void setStatus(node.id, status)}
      loginHref={loginHref(node.id)}
      saveError={saveError?.source === "topic" ? saveError : null}
    />
  );

  return (
    <div
      style={{ "--line": `var(--line-${color})` } as CSSProperties}
      className="lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-10"
    >
      <div>
        <ProgressSummary
          phase={phase}
          summary={summary}
          loginHref={loginHref()}
          saved={saved}
          onSavedChange={(value) => void setSaved(value)}
          saveError={saveError?.source === "saved" ? saveError.message : null}
        />
        <RoadmapLegend />
        <p className="mt-2 text-sm text-muted-foreground">
          Select a topic to see what it covers and free resources to learn it.
        </p>

        <div ref={containerRef} className="relative mt-8">
          {/* Arcs for the selected topic's route, in the gutter left of the line. */}
          {selected && (
            <svg aria-hidden className="pointer-events-none absolute inset-y-0 left-0 h-full w-[30px] overflow-visible">
              {arcs.map((arc) => (
                <path
                  key={arc.key}
                  d={arc.d}
                  fill="none"
                  stroke="var(--line)"
                  strokeWidth={arc.kind === "before" ? 2.5 : 2}
                  strokeLinecap="round"
                  opacity={arc.kind === "before" ? 1 : 0.6}
                  pathLength={1}
                  strokeDasharray="1"
                  className="animate-[route-draw_500ms_ease-out_both]"
                />
              ))}
            </svg>
          )}

          <ol className="space-y-10">
            {graph.stages.map(({ stage, nodes }) => (
              <li key={stage.stage} className="relative pl-14">
                {/* Line segment from this station to the next one (through the 40px gap). */}
                <span
                  aria-hidden
                  className="absolute -bottom-10 w-1.5 -translate-x-1/2 bg-(--line)"
                  style={{ left: TRUNK_X, top: STATION_SIZE / 2 }}
                />
                <span
                  aria-hidden
                  className="absolute rounded-full border-[5px] border-(--line) bg-background"
                  style={{ left: TRUNK_X - STATION_SIZE / 2, top: 0, width: STATION_SIZE, height: STATION_SIZE }}
                />
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <h3 className="text-xl font-bold">{stage.title}</h3>
                  {showStatus && <StageCount nodes={nodes} progress={progress} />}
                </div>
                <p className="mt-1 max-w-prose text-sm text-muted-foreground">{stage.summary}</p>

                <ol className="mt-4 -ml-14 space-y-2">
                  {nodes.map((node) => (
                    <TopicRow
                      key={node.id}
                      node={node}
                      selected={node.id === selected?.id}
                      relation={relations.get(node.id)}
                      status={showStatus ? (progress[node.id] ?? null) : null}
                      stopRef={(el) => {
                        if (el) stopRefs.current.set(node.id, el);
                        else stopRefs.current.delete(node.id);
                      }}
                      buttonRef={(el) => {
                        if (el) buttonRefs.current.set(node.id, el);
                        else buttonRefs.current.delete(node.id);
                      }}
                      onToggle={() => (node.id === selected?.id ? close() : select(node.id))}
                    />
                  ))}
                </ol>
              </li>
            ))}
            <li className="relative pl-14">
              <span
                aria-hidden
                className="absolute rounded-full border-[5px] border-(--line) bg-(--line)"
                style={{ left: TRUNK_X - STATION_SIZE / 2, top: 0, width: STATION_SIZE, height: STATION_SIZE }}
              />
              <p className="font-heading text-xl font-bold">{terminus}</p>
            </li>
          </ol>
        </div>
      </div>

      {/* Desktop: details stay in view beside the roadmap. */}
      <aside
        ref={asideRef}
        aria-label="Topic details"
        className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-xl border bg-card p-5 lg:block"
        onKeyDown={(e) => {
          if (e.key === "Escape" && selected) close();
        }}
      >
        {selected ? (
          isDesktop && (
            <NodeDetails
              node={selected}
              stageTitle={stageTitle(selected)}
              parent={parentOf(selected)}
              next={nextOf(selected)}
              headingId={panelHeadingId}
              headingRef={panelHeadingRef}
              progress={statusControl(selected)}
              onSelect={selectFromDetails}
              onClose={close}
            />
          )
        ) : (
          <div>
            <p className="font-heading text-lg font-bold">Pick a topic</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Each topic has a short explanation, the key concepts to learn and free resources. Its
              route lights up too, so you can see what to learn first and what it leads to.
            </p>
          </div>
        )}
      </aside>

      {/* Phones and tablets: details open in a bottom sheet. */}
      <dialog
        ref={dialogRef}
        aria-labelledby={sheetHeadingId}
        className="m-0 mt-auto max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border-t bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/60 lg:hidden"
        onClose={() => {
          // Closing because the window grew to desktop size keeps the topic selected.
          if (!selected || window.matchMedia(DESKTOP_QUERY).matches) return;
          selectInUrl(null);
          // Return focus to the topic explicitly: a tap doesn't focus buttons on every phone
          // browser, so the dialog's own focus restoration can land on <body>.
          buttonRefs.current.get(selected.id)?.focus({ preventScroll: true });
        }}
        onClick={(e) => {
          // A click on the dialog element itself (not its content) is a click on the backdrop.
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <div className="p-5 pb-8">
          {selected && !isDesktop && (
            <NodeDetails
              node={selected}
              stageTitle={stageTitle(selected)}
              parent={parentOf(selected)}
              next={nextOf(selected)}
              headingId={sheetHeadingId}
              headingRef={sheetHeadingRef}
              progress={statusControl(selected)}
              onSelect={selectFromDetails}
              onClose={close}
            />
          )}
        </div>
      </dialog>
    </div>
  );
}

interface TopicRowProps {
  node: RoadmapNode;
  selected: boolean;
  relation: "before" | "after" | undefined;
  status: ProgressStatus | null;
  stopRef: (el: HTMLElement | null) => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
  onToggle: () => void;
}

const RELATION_LABELS = { before: "Needed first", after: "Comes next" } as const;

function TopicRow({ node, selected, relation, status, stopRef, buttonRef, onToggle }: TopicRowProps) {
  const branch = node.type !== "core";
  const stopX = branch ? BRANCH_X : TRUNK_X;
  const size = STOP_SIZE[node.type];

  return (
    <li id={node.id} className={cn("relative scroll-mt-24", branch ? "pl-[76px]" : "pl-14")}>
      {branch && (
        // The branch peels off the trunk and curves into this row's stop.
        <svg
          aria-hidden
          className="absolute top-0 overflow-visible"
          style={{ left: TRUNK_X }}
          width={BRANCH_X - TRUNK_X}
          height={ROW_CENTER}
        >
          <path
            d={`M 0 -4 Q 0 ${ROW_CENTER} ${BRANCH_X - TRUNK_X - size / 2} ${ROW_CENTER}`}
            fill="none"
            stroke="var(--line)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={node.type === "elective" ? "5 4" : "0.5 5"}
          />
        </svg>
      )}
      <NodeStop
        ref={stopRef}
        type={node.type}
        status={status}
        className={cn("absolute", selected && "ring-4 ring-(--line)/30")}
        style={{ left: stopX - size / 2, top: ROW_CENTER - size / 2 }}
      />
      <button
        ref={buttonRef}
        type="button"
        aria-pressed={selected}
        onClick={onToggle}
        className={cn(
          "flex min-h-11 w-full items-center gap-3 rounded-lg border px-3.5 py-2 text-left transition-colors hover:border-(--line)",
          node.type === "core" && "bg-card",
          node.type === "elective" && "border-dashed border-(--line)/60 bg-card",
          node.type === "optional-skill" && "border-dotted border-(--line)/60 bg-transparent",
          relation && "border-solid border-(--line)",
          selected && "border-solid border-(--line) bg-(--line)/10 ring-2 ring-(--line)/30",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className={cn("block leading-snug font-medium", status === "skipped" && "text-muted-foreground")}>
            {node.title}
          </span>
          {branch ? (
            <span className="block text-xs text-muted-foreground">{NODE_TYPE_LABELS[node.type]}</span>
          ) : (
            <span className="sr-only">, core topic</span>
          )}
        </span>
        {(relation || status) && (
          <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
            {relation && (
              <span className="rounded-full bg-(--line)/15 px-2 py-0.5 text-xs font-medium">
                {RELATION_LABELS[relation]}
              </span>
            )}
            {status && <StatusBadge status={status} />}
          </span>
        )}
      </button>
    </li>
  );
}

function StatusBadge({ status }: { status: ProgressStatus }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 text-xs font-medium",
        status === "done" && "text-status-done",
        status === "in-progress" && "text-status-progress",
        status === "skipped" && "text-muted-foreground",
      )}
    >
      {status === "done" && <CheckIcon aria-hidden className="size-3.5" />}
      {STATUS_LABELS[status]}
    </span>
  );
}

function StageCount({ nodes, progress }: { nodes: RoadmapNode[]; progress: ProgressMap }) {
  const { done, counted } = summariseProgress(
    nodes.map((n) => n.id),
    progress,
  );
  return (
    <p className="text-sm text-muted-foreground">
      {done} of {counted} done
    </p>
  );
}
