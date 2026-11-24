import { NIGERIAN_STATES, OWNERSHIP_LABELS, OWNERSHIPS, type Ownership } from "@/lib/content/constants";
import { SelectField, TextAreaField, TextField } from "./fields";

interface UniversityDefaults {
  name: string;
  shortName: string;
  city: string;
  state: string;
  ownership: Ownership;
  website: string | null;
  description: string | null;
}

/** The fields of a university, shared by the "add" and "edit" forms. */
export function UniversityFields({ defaults }: { defaults?: UniversityDefaults }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <TextField id="u-name" name="name" label="Full name" defaultValue={defaults?.name} required placeholder="University of Benin" />
        <TextField id="u-short" name="shortName" label="Abbreviation" defaultValue={defaults?.shortName} required placeholder="UNIBEN" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField id="u-city" name="city" label="City or campus" defaultValue={defaults?.city} required placeholder="Benin City" />
        <TextField id="u-state" name="state" label="State" defaultValue={defaults?.state} required list="nigerian-states" />
        <SelectField id="u-ownership" name="ownership" label="Ownership" defaultValue={defaults?.ownership ?? "federal"} required>
          {OWNERSHIPS.map((o) => (
            <option key={o} value={o}>
              {OWNERSHIP_LABELS[o]}
            </option>
          ))}
        </SelectField>
      </div>
      <datalist id="nigerian-states">
        {NIGERIAN_STATES.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <TextField
        id="u-website"
        name="website"
        label="Website (optional)"
        type="url"
        inputMode="url"
        defaultValue={defaults?.website}
        placeholder="https://"
      />
      <TextAreaField
        id="u-description"
        name="description"
        label="About (optional)"
        hint="A sentence or two students will see on the university's page."
        defaultValue={defaults?.description}
      />
    </>
  );
}
