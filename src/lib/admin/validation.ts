/**
 * Validation for admin forms. Pure (no server imports) so it's tested directly. Every message
 * names the field and says how to fix it, because editors see them as-is.
 */
import { z } from "zod";
import { NODE_TYPES, OWNERSHIPS } from "@/lib/content/constants";

export type FormState = { status: "idle" } | { status: "saved"; message: string } | { status: "error"; message: string };

const text = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${label}: enter at least ${min} characters.`)
    .max(max, `${label}: keep it under ${max} characters.`);

/** Optional text: blank becomes null. */
const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label}: keep it under ${max} characters.`)
    .transform((v) => v || null);

/** Optional whole number from a form field: blank becomes null. */
const optionalInt = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < min || n > max) {
        ctx.addIssue({ code: "custom", message: `${label}: enter a whole number from ${min} to ${max}.` });
        return z.NEVER;
      }
      return n;
    });

export const universitySchema = z.object({
  name: text("Name", 2, 120),
  shortName: text("Abbreviation", 2, 20).transform((v) => v.toUpperCase()),
  city: text("City", 2, 80),
  state: text("State", 2, 40),
  ownership: z.enum(OWNERSHIPS, "Ownership: choose federal, state or private."),
  website: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https?:\/\/\S+\.\S+$/.test(v), "Website: enter a full address starting with https://")
    .transform((v) => v || null),
  description: optionalText("Description", 2000),
});

export const newUniversitySchema = universitySchema.extend({
  id: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Web address: use lowercase letters, numbers and hyphens, like uniben."),
});

export const universityCourseSchema = z.object({
  department: optionalText("Department", 120),
  faculty: optionalText("Faculty", 120),
  durationYears: optionalInt("Length in years", 1, 8),
  utmeSubjects: z
    .string()
    .max(1200)
    .transform((v) =>
      v
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    )
    .pipe(
      z
        .array(z.string().max(120, "UTME subjects: keep each line under 120 characters."))
        .max(8, "UTME subjects: list at most 8 lines."),
    ),
  admissionNotes: optionalText("Admission notes", 2000),
  notes: optionalText("Other notes", 2000),
});

export const moduleSchema = z.object({
  code: text("Code", 2, 20).transform((v) => v.toUpperCase()),
  title: text("Title", 2, 160),
  year: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 8) {
        ctx.addIssue({ code: "custom", message: "Year: choose a year of study." });
        return z.NEVER;
      }
      return n;
    }),
  semester: z.enum(["first", "second", ""], "Semester: choose first, second or all year.").transform((v) => v || null),
  creditUnits: optionalInt("Credit units", 0, 30),
  type: z.enum(NODE_TYPES, "Type: choose core, elective or optional skill."),
  description: optionalText("Description", 2000),
  topicId: z
    .string()
    .trim()
    .max(120)
    .transform((v) => v || null),
});

/** Reads the named fields from a form as strings (missing fields become ""). */
export function readForm(formData: FormData, fields: readonly string[]): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f, String(formData.get(f) ?? "")]));
}

/** The first validation message, which is already written for the person filling in the form. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the form and try again.";
}
