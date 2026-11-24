import { describe, expect, it } from "vitest";
import { moduleSchema, newUniversitySchema, universityCourseSchema } from "@/lib/admin/validation";

describe("newUniversitySchema", () => {
  const valid = {
    id: "UniBen",
    name: "University of Benin",
    shortName: "uniben",
    city: "Benin City",
    state: "Edo",
    ownership: "federal",
    website: "",
    description: "  ",
  };

  it("normalises the id and abbreviation, and blanks become null", () => {
    expect(newUniversitySchema.parse(valid)).toEqual({
      ...valid,
      id: "uniben",
      shortName: "UNIBEN",
      website: null,
      description: null,
    });
  });

  it("explains what's wrong in plain words", () => {
    const result = newUniversitySchema.safeParse({ ...valid, id: "uni ben", website: "uniben.edu" });
    expect(result.success).toBe(false);
    const messages = result.error!.issues.map((i) => i.message);
    expect(messages).toContain("Web address: use lowercase letters, numbers and hyphens, like uniben.");
    expect(messages).toContain("Website: enter a full address starting with https://");
  });
});

describe("universityCourseSchema", () => {
  it("splits UTME subjects into lines and reads optional numbers", () => {
    const parsed = universityCourseSchema.parse({
      department: "Computer Science",
      faculty: "",
      durationYears: "",
      utmeSubjects: "Use of English\n\n  Mathematics \nPhysics",
      admissionNotes: "",
      notes: "",
    });
    expect(parsed).toMatchObject({ faculty: null, durationYears: null, utmeSubjects: ["Use of English", "Mathematics", "Physics"] });
    expect(universityCourseSchema.safeParse({ ...parsed, utmeSubjects: "", durationYears: "nine" }).success).toBe(false);
  });
});

describe("moduleSchema", () => {
  const valid = {
    code: "csc 211",
    title: "Data Structures",
    year: "2",
    semester: "first",
    creditUnits: "3",
    type: "core",
    description: "",
    topicId: "cs-y2-data-structures",
  };

  it("parses a module", () => {
    expect(moduleSchema.parse(valid)).toEqual({
      code: "CSC 211",
      title: "Data Structures",
      year: 2,
      semester: "first",
      creditUnits: 3,
      type: "core",
      description: null,
      topicId: "cs-y2-data-structures",
    });
  });

  it("allows all-year modules with no units or topic", () => {
    expect(moduleSchema.parse({ ...valid, semester: "", creditUnits: "", topicId: "" })).toMatchObject({
      semester: null,
      creditUnits: null,
      topicId: null,
    });
  });

  it("rejects out-of-range numbers", () => {
    expect(moduleSchema.safeParse({ ...valid, year: "0" }).error?.issues[0].message).toBe("Year: choose a year of study.");
    expect(moduleSchema.safeParse({ ...valid, creditUnits: "2.5" }).error?.issues[0].message).toBe(
      "Credit units: enter a whole number from 0 to 30.",
    );
  });
});
