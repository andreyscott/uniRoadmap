-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "RoadmapKind" AS ENUM ('DEGREE', 'SKILL');

-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('CORE', 'ELECTIVE', 'OPTIONAL_SKILL');

-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('DONE', 'IN_PROGRESS', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('VIDEO', 'COURSE', 'BOOK', 'ARTICLE', 'TOOL');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faculties" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "faculties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "overview" TEXT NOT NULL,
    "durationYears" INTEGER NOT NULL,
    "durationNotes" TEXT,
    "difficulty" "Difficulty" NOT NULL,
    "entryRequirements" JSONB NOT NULL,
    "careers" JSONB NOT NULL,
    "tagProfile" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmaps" (
    "id" TEXT NOT NULL,
    "kind" "RoadmapKind" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "stages" JSONB NOT NULL,
    "courseId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_nodes" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "parentId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "keyConcepts" TEXT[],
    "type" "NodeType" NOT NULL,
    "stage" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "roadmap_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL,
    "free" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_progress" (
    "userId" UUID NOT NULL,
    "nodeId" TEXT NOT NULL,
    "status" "ProgressStatus" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_progress_pkey" PRIMARY KEY ("userId","nodeId")
);

-- CreateTable
CREATE TABLE "saved_roadmaps" (
    "userId" UUID NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_roadmaps_pkey" PRIMARY KEY ("userId","roadmapId")
);

-- CreateTable
CREATE TABLE "quiz_questions" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB NOT NULL,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_results" (
    "id" TEXT NOT NULL,
    "userId" UUID,
    "answers" JSONB NOT NULL,
    "topCourses" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "courses_facultyId_idx" ON "courses"("facultyId");

-- CreateIndex
CREATE UNIQUE INDEX "roadmaps_courseId_key" ON "roadmaps"("courseId");

-- CreateIndex
CREATE INDEX "roadmaps_kind_idx" ON "roadmaps"("kind");

-- CreateIndex
CREATE INDEX "roadmap_nodes_roadmapId_stage_position_idx" ON "roadmap_nodes"("roadmapId", "stage", "position");

-- CreateIndex
CREATE INDEX "roadmap_nodes_parentId_idx" ON "roadmap_nodes"("parentId");

-- CreateIndex
CREATE INDEX "resources_nodeId_idx" ON "resources"("nodeId");

-- CreateIndex
CREATE INDEX "user_progress_nodeId_idx" ON "user_progress"("nodeId");

-- CreateIndex
CREATE INDEX "saved_roadmaps_roadmapId_idx" ON "saved_roadmaps"("roadmapId");

-- CreateIndex
CREATE INDEX "quiz_results_userId_idx" ON "quiz_results"("userId");

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "faculties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmaps" ADD CONSTRAINT "roadmaps_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_nodes" ADD CONSTRAINT "roadmap_nodes_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "roadmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_nodes" ADD CONSTRAINT "roadmap_nodes_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "roadmap_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "roadmap_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "roadmap_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_roadmaps" ADD CONSTRAINT "saved_roadmaps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_roadmaps" ADD CONSTRAINT "saved_roadmaps_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "roadmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_results" ADD CONSTRAINT "quiz_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Supabase exposes the public schema through its Data API (PostgREST) to anyone holding the
-- publishable key. Enable row-level security with no policies so those API roles can read or
-- write nothing. The app talks to the database only through Prisma, which connects as the
-- table owner and is not subject to RLS.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "faculties" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "courses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roadmaps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roadmap_nodes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "resources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_progress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "saved_roadmaps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quiz_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quiz_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
