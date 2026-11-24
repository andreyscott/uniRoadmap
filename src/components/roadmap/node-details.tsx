import type { ReactNode, Ref } from "react";
import {
  BookOpenIcon,
  CirclePlayIcon,
  ExternalLinkIcon,
  FileTextIcon,
  GraduationCapIcon,
  WrenchIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RESOURCE_TYPE_LABELS, type NodeType, type ResourceType } from "@/lib/content/constants";
import Link from "next/link";
import { SEMESTER_LABELS } from "@/lib/content/constants";
import type { ViewerNode } from "./types";

const RESOURCE_ICONS: Record<ResourceType, LucideIcon> = {
  video: CirclePlayIcon,
  course: GraduationCapIcon,
  book: BookOpenIcon,
  article: FileTextIcon,
  tool: WrenchIcon,
};

const TYPE_PHRASE: Record<NodeType, string> = {
  core: "Core topic",
  elective: "Elective",
  "optional-skill": "Optional skill",
};

interface NodeDetailsProps {
  node: ViewerNode;
  stageTitle: string;
  /** The topic this one builds on, if any. */
  parent: ViewerNode | null;
  /** Topics that build on this one. */
  next: ViewerNode[];
  headingId: string;
  headingRef?: Ref<HTMLHeadingElement>;
  /** Progress controls, shown under the title. */
  progress?: ReactNode;
  onSelect: (id: string) => void;
  onClose: () => void;
}

function hostname(url: string) {
  return new URL(url).hostname.replace(/^www\./, "");
}

/** Everything about one topic: shown in the side panel (desktop) or bottom sheet (phones). */
export function NodeDetails({
  node,
  stageTitle,
  parent,
  next,
  headingId,
  headingRef,
  progress,
  onSelect,
  onClose,
}: NodeDetailsProps) {
  return (
    <article aria-labelledby={headingId}>
      <div className="flex items-start justify-between gap-3">
        <p className="pt-1.5 text-sm text-muted-foreground">
          {moduleLine(node) ?? `${TYPE_PHRASE[node.type]}, ${stageTitle}`}
        </p>
        <Button type="button" variant="ghost" size="icon" className="-mr-2 size-9" onClick={onClose}>
          <XIcon aria-hidden className="size-5" />
          <span className="sr-only">Close topic</span>
        </Button>
      </div>
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="text-2xl font-bold tracking-tight outline-none"
      >
        {node.title}
      </h2>
      {progress}
      <p className="mt-4">{node.description || <span className="text-muted-foreground">No description yet.</span>}</p>
      {node.generalTopic && (
        <p className="mt-3 text-sm text-muted-foreground">
          Covers the general topic{" "}
          <Link href={node.generalTopic.href} className="font-medium text-primary underline underline-offset-4">
            {node.generalTopic.title}
          </Link>
          .
        </p>
      )}

      {node.keyConcepts.length > 0 && (
        <>
          <h3 className="mt-6 font-heading text-sm font-bold">Key concepts</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {node.keyConcepts.map((concept) => (
              <li key={concept} className="rounded-md bg-muted px-2 py-1 text-sm">
                {concept}
              </li>
            ))}
          </ul>
        </>
      )}

      {(parent || next.length > 0) && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {parent && (
            <div>
              <h3 className="font-heading text-sm font-bold">Needed first</h3>
              <RelatedButton node={parent} onSelect={onSelect} />
            </div>
          )}
          {next.length > 0 && (
            <div>
              <h3 className="font-heading text-sm font-bold">Comes next</h3>
              <ul>
                {next.map((child) => (
                  <li key={child.id}>
                    <RelatedButton node={child} onSelect={onSelect} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <h3 className="mt-6 font-heading text-sm font-bold">Free resources</h3>
      {node.resources.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">No free resources linked yet.</p>
      )}
      <ul className="mt-2 grid gap-2">
        {node.resources.map((resource) => {
          const Icon = RESOURCE_ICONS[resource.type];
          return (
            <li key={resource.url}>
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group/resource flex items-start gap-3 rounded-lg border bg-background p-3 hover:border-(--line) hover:bg-muted/60"
              >
                <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium leading-snug group-hover/resource:underline">
                    {resource.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {RESOURCE_TYPE_LABELS[resource.type]} from {hostname(resource.url)}
                    {!resource.free && ", paid"}
                  </span>
                </span>
                <ExternalLinkIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

function RelatedButton({ node, onSelect }: { node: ViewerNode; onSelect: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(node.id)}
      className="mt-1 rounded-sm text-left text-primary underline underline-offset-4 hover:no-underline"
    >
      {node.title}
    </button>
  );
}

/** "CSC 211, 3 units, first semester" for a university module; null for general topics. */
function moduleLine(node: ViewerNode): string | null {
  if (!node.code) return null;
  return [
    node.code,
    node.creditUnits != null && `${node.creditUnits} ${node.creditUnits === 1 ? "unit" : "units"}`,
    node.semester ? SEMESTER_LABELS[node.semester].toLowerCase() : "all year",
    TYPE_PHRASE[node.type].toLowerCase(),
  ]
    .filter(Boolean)
    .join(", ");
}
