import type { Tag } from "@/lib/content/constants";

/**
 * Copy for "why this fits you". A reason joins what the student told us (`you`) with what the
 * course offers (`course`): "You enjoy maths, and it runs through this whole course."
 * Only used for tags the course weights 2 or 3, so the course clauses can be confident.
 */
export const TAG_REASONS: Record<Tag, { you: string; course: string }> = {
  maths: { you: "You enjoy maths", course: "it runs through this whole course" },
  physics: { you: "You enjoy physics", course: "this course builds directly on it" },
  chemistry: { you: "You enjoy chemistry", course: "this course builds directly on it" },
  biology: { you: "You enjoy biology", course: "this course is built on it" },
  economics: { you: "You enjoy economics", course: "you'll use it every year of this course" },
  technology: { you: "You're into computers and technology", course: "this course is about building with them" },
  writing: { you: "You like reading and writing", course: "you'll write a lot on this course" },
  languages: { you: "You enjoy languages", course: "this course puts them to use" },
  "art-design": { you: "You enjoy art and design", course: "this course rewards a creative eye" },
  "social-studies": { you: "You're interested in people and society", course: "that's what this course studies" },
  analytical: { you: "You like analysing problems carefully", course: "this course trains exactly that" },
  "problem-solving": { you: "You enjoy solving problems", course: "much of this course is problem solving" },
  creative: { you: "You like making new things", course: "this course leaves room for creativity" },
  communication: { you: "You communicate well", course: "this field depends on it" },
  "helping-people": { you: "You want to help people directly", course: "this course leads to work that does" },
  leadership: { you: "You like taking the lead", course: "this course prepares you to manage and lead" },
  "detail-oriented": { you: "You're careful with details", course: "small details matter a lot here" },
  "hands-on": { you: "You like working with your hands", course: "this course is very practical" },
  research: { you: "You like finding things out", course: "research is a big part of this course" },
  "business-minded": { you: "You think like a businessperson", course: "this course is about how organisations work and make money" },
  structured: { you: "You like clear rules and structure", course: "this field runs on standards and procedures" },
  lab: { you: "You'd enjoy working in a lab", course: "much of this work happens in one" },
  office: { you: "You're happy working in an office", course: "that's where most graduates work" },
  clinical: { you: "You'd like to work in a hospital or clinic", course: "that's where this course leads" },
  outdoors: { you: "You'd rather not be stuck at a desk", course: "this work often happens on site or in the field" },
  teamwork: { you: "You like working in a team", course: "this work is done in teams" },
  independent: { you: "You like working on your own", course: "this work gives you room to" },
  "high-earning": { you: "Earning well matters to you", course: "graduates are among the better paid" },
  "job-security": { you: "You want a secure job", course: "graduates are in steady demand" },
  "social-impact": { you: "You want your work to make a difference", course: "this career does" },
  entrepreneurship: { you: "You'd like to start your own thing one day", course: "many graduates do" },
  "global-mobility": { you: "You'd like the option to work abroad", course: "this qualification travels well" },
};

/**
 * School-subject tags the quiz asks about directly. If a course leans heavily on one of these
 * and the student didn't pick it, the results say so ("Worth knowing").
 */
export const SUBJECT_TAG_NAMES: Partial<Record<Tag, string>> = {
  maths: "maths",
  physics: "physics",
  chemistry: "chemistry",
  biology: "biology",
  economics: "economics",
  writing: "reading and writing",
};
