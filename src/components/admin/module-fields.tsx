import { NODE_TYPE_LABELS, NODE_TYPES, type NodeType, type Semester } from "@/lib/content/constants";
import { SelectField, TextAreaField, TextField } from "./fields";

export interface TopicOption {
  id: string;
  title: string;
  stageTitle: string;
}

interface ModuleDefaults {
  code: string;
  title: string;
  year: number;
  semester: Semester | null;
  creditUnits: number | null;
  type: NodeType;
  description: string | null;
  topicId: string | null;
}

interface ModuleFieldsProps {
  /** Keeps field ids unique when several module forms share a page. */
  idPrefix: string;
  years: number;
  topics: TopicOption[];
  defaults?: Partial<ModuleDefaults>;
}

/** The fields of a curriculum module, shared by the "add" and "edit" forms. */
export function ModuleFields({ idPrefix, years, topics, defaults }: ModuleFieldsProps) {
  const id = (name: string) => `${idPrefix}-${name}`;
  const stages = [...new Set(topics.map((t) => t.stageTitle))];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
        <TextField id={id("code")} name="code" label="Code" required defaultValue={defaults?.code} placeholder="CSC 211" />
        <TextField id={id("title")} name="title" label="Title" required defaultValue={defaults?.title} placeholder="Data Structures" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SelectField id={id("year")} name="year" label="Year" required defaultValue={defaults?.year ?? 1}>
          {Array.from({ length: years }, (_, i) => (
            <option key={i} value={i + 1}>
              Year {i + 1}
            </option>
          ))}
        </SelectField>
        <SelectField id={id("semester")} name="semester" label="Semester" defaultValue={defaults?.semester ?? "first"}>
          <option value="first">First</option>
          <option value="second">Second</option>
          <option value="">All year</option>
        </SelectField>
        <TextField
          id={id("units")}
          name="creditUnits"
          label="Credit units"
          inputMode="numeric"
          defaultValue={defaults?.creditUnits}
          placeholder="3"
        />
        <SelectField id={id("type")} name="type" label="Type" defaultValue={defaults?.type ?? "core"}>
          {NODE_TYPES.map((t) => (
            <option key={t} value={t}>
              {NODE_TYPE_LABELS[t]}
            </option>
          ))}
        </SelectField>
      </div>
      <SelectField
        id={id("topic")}
        name="topicId"
        label="General topic it covers (optional)"
        hint="Students then see that topic's explanation and free resources with this module."
        defaultValue={defaults?.topicId}
      >
        <option value="">None</option>
        {stages.map((stage) => (
          <optgroup key={stage} label={stage}>
            {topics
              .filter((t) => t.stageTitle === stage)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
          </optgroup>
        ))}
      </SelectField>
      <TextAreaField
        id={id("description")}
        name="description"
        label="Description (optional)"
        hint="What this module covers at this university. Leave blank to use the general topic's explanation."
        defaultValue={defaults?.description}
      />
    </>
  );
}
