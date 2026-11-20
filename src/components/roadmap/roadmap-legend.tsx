import { NODE_TYPE_LABELS, NODE_TYPES } from "@/lib/content/constants";
import { NodeStop } from "./node-stop";

/**
 * Key for the stop shapes. Purely visual help: each topic button also says its type in text.
 * Uses the --line colour of its parent.
 */
export function RoadmapLegend() {
  return (
    <ul aria-label="Key" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      {NODE_TYPES.map((type) => (
        <li key={type} className="flex items-center gap-2">
          <span className="flex w-[18px] justify-center">
            <NodeStop type={type} />
          </span>
          {NODE_TYPE_LABELS[type]}
        </li>
      ))}
    </ul>
  );
}
