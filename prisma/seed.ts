/**
 * `npm run db:seed`: copies /content into the database. Safe to run repeatedly.
 *
 * - Faculties, courses, roadmaps, nodes and resources are upserted, so ids stay stable
 *   and existing user progress keeps pointing at the right nodes.
 * - Quiz questions are replaced to match content/quiz.json (nothing references them by key).
 * - Nodes that exist in the database but were removed from /content are NOT deleted by
 *   default, because deleting a node deletes users' progress on it. They're listed as a
 *   warning. Pass `-- --prune` to delete them deliberately.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { ContentError, loadContent, loadQuiz } from "../src/lib/content/load";
import type { Course, Roadmap, RoadmapNode } from "../src/lib/content/schemas";

for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // optional file
  }
}

const prune = process.argv.includes("--prune");

// Seeding runs many statements in transactions, so prefer the direct connection.
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error("✗ Set DIRECT_URL (or DATABASE_URL) in .env.local before seeding.");
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// Content uses lowercase-kebab values; the database uses Prisma enums.
const toEnum = <T extends string>(value: string) => value.toUpperCase().replaceAll("-", "_") as T;

type Tx = Prisma.TransactionClient;

interface RoadmapInput {
  id: string;
  kind: "DEGREE" | "SKILL";
  title: string;
  description: string;
  courseId?: string;
  roadmap: Roadmap;
}

async function syncRoadmap(tx: Tx, input: RoadmapInput) {
  const { id, kind, title, description, courseId, roadmap } = input;
  const data = { kind, title, description, stages: roadmap.stages, courseId: courseId ?? null };
  await tx.roadmap.upsert({ where: { id }, create: { id, ...data }, update: data });

  // Position = order within its stage, as written in the file.
  const positions = new Map<number, number>();
  const nodeData = (node: RoadmapNode) => {
    const position = positions.get(node.stage) ?? 0;
    positions.set(node.stage, position + 1);
    return {
      roadmapId: id,
      title: node.title,
      description: node.description,
      keyConcepts: node.keyConcepts,
      type: toEnum<"CORE" | "ELECTIVE" | "OPTIONAL_SKILL">(node.type),
      stage: node.stage,
      position,
    };
  };

  // Pass 1: upsert every node without its parent, so parent rows always exist for pass 2.
  for (const node of roadmap.nodes) {
    const nd = nodeData(node);
    await tx.roadmapNode.upsert({ where: { id: node.id }, create: { id: node.id, ...nd }, update: nd });
  }

  // Pass 2: link parents and replace resources (resources have no user data hanging off them).
  for (const node of roadmap.nodes) {
    await tx.roadmapNode.update({ where: { id: node.id }, data: { parentId: node.parent ?? null } });
  }
  const nodeIds = roadmap.nodes.map((n) => n.id);
  await tx.resource.deleteMany({ where: { nodeId: { in: nodeIds } } });
  await tx.resource.createMany({
    data: roadmap.nodes.flatMap((node) =>
      node.resources.map((r, position) => ({
        nodeId: node.id,
        title: r.title,
        url: r.url,
        type: toEnum<"VIDEO" | "COURSE" | "BOOK" | "ARTICLE" | "TOOL">(r.type),
        free: r.free,
        position,
      })),
    ),
  });

  // Nodes removed from the content file.
  const stale = await tx.roadmapNode.findMany({
    where: { roadmapId: id, id: { notIn: nodeIds } },
    select: { id: true, _count: { select: { progress: true } } },
  });
  if (stale.length > 0) {
    if (prune) {
      await tx.roadmapNode.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
      console.warn(`  pruned ${stale.length} removed node(s) from ${id}`);
    } else {
      for (const s of stale) {
        console.warn(`  ! ${id}: node "${s.id}" is no longer in /content (${s._count.progress} progress rows). Run with --prune to delete.`);
      }
    }
  }
  return roadmap.nodes.length;
}

function courseData(course: Course) {
  return {
    name: course.name,
    facultyId: course.faculty,
    summary: course.summary,
    overview: course.overview,
    durationYears: course.durationYears,
    durationNotes: course.durationNotes ?? null,
    difficulty: toEnum<"BEGINNER" | "INTERMEDIATE" | "ADVANCED">(course.difficulty),
    entryRequirements: course.entryRequirements,
    careers: course.careers,
    tagProfile: course.tags,
  };
}

async function main() {
  const { faculties, courses, skills } = loadContent();
  const txOptions = { timeout: 60_000, maxWait: 10_000 };

  await prisma.$transaction(async (tx) => {
    for (const [position, f] of faculties.entries()) {
      const data = { name: f.name, description: f.description, color: f.color, position };
      await tx.faculty.upsert({ where: { id: f.id }, create: { id: f.id, ...data }, update: data });
    }
  }, txOptions);
  console.log(`✓ ${faculties.length} faculties`);

  // One transaction per roadmap keeps each one consistent without one giant lock.
  for (const course of courses) {
    const nodes = await prisma.$transaction(async (tx) => {
      const data = courseData(course);
      await tx.course.upsert({ where: { id: course.id }, create: { id: course.id, ...data }, update: data });
      if (!course.roadmap) return 0;
      return syncRoadmap(tx, {
        id: course.id,
        kind: "DEGREE",
        title: course.name,
        description: course.summary,
        courseId: course.id,
        roadmap: course.roadmap,
      });
    }, txOptions);
    console.log(`✓ course  ${course.id} (${nodes} nodes)`);
  }

  for (const skill of skills) {
    const nodes = await prisma.$transaction(
      (tx) =>
        syncRoadmap(tx, {
          id: skill.id,
          kind: "SKILL",
          title: skill.title,
          description: skill.description,
          roadmap: skill.roadmap,
        }),
      txOptions,
    );
    console.log(`✓ skill   ${skill.id} (${nodes} nodes)`);
  }

  const quiz = loadQuiz();
  await prisma.$transaction(async (tx) => {
    for (const [position, q] of quiz.questions.entries()) {
      const data = { position, prompt: q.prompt, help: q.help ?? null, kind: q.kind, maxChoices: q.max ?? null, options: q.options };
      await tx.quizQuestion.upsert({ where: { id: q.id }, create: { id: q.id, ...data }, update: data });
    }
    // Results store answers as JSON, not foreign keys, so removed questions can simply go.
    await tx.quizQuestion.deleteMany({ where: { id: { notIn: quiz.questions.map((q) => q.id) } } });
  }, txOptions);
  console.log(`✓ quiz    ${quiz.questions.length} questions`);
}

main()
  .catch((err) => {
    console.error(err instanceof ContentError ? `✗ ${err.message}` : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
