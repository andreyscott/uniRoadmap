import { describe, expect, it } from "vitest";
import { getCourse, getFaculties, getFaculty } from "@/lib/content/load";
import {
  EMPTY_FILTERS,
  careerId,
  countActiveFilters,
  directoryOptions,
  filterCourses,
  filtersToQuery,
  parseFilters,
  toListing,
  type DirectoryFilters,
} from "@/lib/content/directory";

// A fixed set of real courses, so adding content doesn't change these expectations.
const FIXTURE_IDS = ["accounting", "computer-science", "medicine-and-surgery"];
const listings = FIXTURE_IDS.map((id) => getCourse(id)!).map((c) => toListing(c, getFaculty(c.faculty)!));
const options = directoryOptions(listings, getFaculties());
const ids = (filters: Partial<DirectoryFilters>) =>
  filterCourses(listings, { ...EMPTY_FILTERS, ...filters }).map((l) => l.id);

describe("careerId", () => {
  it("slugifies titles", () => {
    expect(careerId("Data scientist or ML engineer")).toBe("data-scientist-or-ml-engineer");
    expect(careerId("General practitioner (family doctor)")).toBe("general-practitioner-family-doctor");
  });
});

describe("directoryOptions", () => {
  it("only offers faculties that have courses", () => {
    expect(options.faculties.map((f) => f.id).sort()).toEqual(["business", "engineering", "health"]);
  });

  it("offers each exam's required subjects in a fixed order", () => {
    expect(options.subjectsByExam.utme?.map((s) => s.id)).toEqual([
      "english",
      "maths",
      "physics",
      "chemistry",
      "biology",
      "economics",
    ]);
  });
});

describe("parseFilters and filtersToQuery", () => {
  it("round-trips through the URL", () => {
    const filters: DirectoryFilters = {
      q: "data",
      faculties: ["engineering", "health"],
      difficulties: ["advanced"],
      career: "auditor",
      exam: "utme",
      subjects: ["english", "maths"],
    };
    const query = filtersToQuery(filters);
    expect(parseFilters(new URLSearchParams(query), options)).toEqual(filters);
  });

  it("returns an empty query for empty filters", () => {
    expect(filtersToQuery(EMPTY_FILTERS)).toBe("");
  });

  it("drops unknown values, duplicates, and subjects without an exam", () => {
    const params = new URLSearchParams(
      "q=%20law%20&faculty=engineering&faculty=engineering&faculty=nope&difficulty=easy&career=astronaut&subject=maths",
    );
    expect(parseFilters(params, options)).toEqual({ ...EMPTY_FILTERS, q: "law", faculties: ["engineering"] });
  });

  it("drops subjects no course requires for the chosen exam", () => {
    const params = new URLSearchParams("exam=alevel&subject=maths&subject=economics");
    expect(parseFilters(params, options).subjects).toEqual(["maths"]);
  });
});

describe("filterCourses", () => {
  it("lists everything A-Z with no filters", () => {
    expect(ids({})).toEqual(["accounting", "computer-science", "medicine-and-surgery"]);
  });

  it("searches names, careers and topics, with name matches first", () => {
    expect(ids({ q: "comp sci" })).toEqual(["computer-science"]);
    expect(ids({ q: "auditor" })).toEqual(["accounting"]);
    expect(ids({ q: "anatomy" })).toEqual(["medicine-and-surgery"]);
    expect(ids({ q: "MBBS" })).toEqual(["medicine-and-surgery"]);
    expect(ids({ q: "zzz" })).toEqual([]);
  });

  it("filters by faculty, difficulty and career", () => {
    expect(ids({ faculties: ["health", "business"] })).toEqual(["accounting", "medicine-and-surgery"]);
    expect(ids({ difficulties: ["intermediate"] })).toEqual(["accounting"]);
    expect(ids({ career: careerId("Software engineer") })).toEqual(["computer-science"]);
  });

  it("keeps courses whose required subjects the student has", () => {
    // A typical science UTME combination without Biology.
    expect(ids({ exam: "utme", subjects: ["english", "maths", "physics", "chemistry"] })).toEqual([
      "computer-science",
    ]);
    expect(ids({ exam: "utme", subjects: ["english", "biology", "chemistry", "physics"] })).toEqual([
      "medicine-and-surgery",
    ]);
    // No subjects ticked yet: every course that lists requirements for the exam.
    expect(ids({ exam: "utme" })).toHaveLength(3);
    // Accounting asks for no specific A-levels.
    expect(ids({ exam: "alevel", subjects: ["biology"] })).toEqual(["accounting"]);
  });
});

describe("countActiveFilters", () => {
  it("counts every chosen option except the search text", () => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, q: "x" })).toBe(0);
    expect(
      countActiveFilters({
        q: "",
        faculties: ["a", "b"],
        difficulties: ["advanced"],
        career: "c",
        exam: "utme",
        subjects: ["english"],
      }),
    ).toBe(6);
  });
});
