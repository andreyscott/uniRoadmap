-- Universities, their versions of each course and curricula, per-module progress, roles,
-- university editors and the admin edit log.
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'EDITOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "Ownership" AS ENUM ('FEDERAL', 'STATE', 'PRIVATE');

-- CreateEnum
CREATE TYPE "Semester" AS ENUM ('FIRST', 'SECOND');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'STUDENT',
ADD COLUMN     "universityId" TEXT;

-- CreateTable
CREATE TABLE "universities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "ownership" "Ownership" NOT NULL,
    "website" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "universities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "university_courses" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "department" TEXT,
    "faculty" TEXT,
    "durationYears" INTEGER,
    "utmeSubjects" TEXT[],
    "admissionNotes" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "university_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "university_modules" (
    "id" TEXT NOT NULL,
    "universityCourseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "semester" "Semester",
    "creditUnits" INTEGER,
    "type" "NodeType" NOT NULL DEFAULT 'CORE',
    "description" TEXT,
    "topicId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "university_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_progress" (
    "userId" UUID NOT NULL,
    "moduleId" TEXT NOT NULL,
    "status" "ProgressStatus" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_progress_pkey" PRIMARY KEY ("userId","moduleId")
);

-- CreateTable
CREATE TABLE "university_editors" (
    "userId" UUID NOT NULL,
    "universityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "university_editors_pkey" PRIMARY KEY ("userId","universityId")
);

-- CreateTable
CREATE TABLE "edit_log" (
    "id" TEXT NOT NULL,
    "userId" UUID,
    "universityId" TEXT,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "undoneAt" TIMESTAMP(3),
    "undoneById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "edit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "university_courses_courseId_idx" ON "university_courses"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "university_courses_universityId_courseId_key" ON "university_courses"("universityId", "courseId");

-- CreateIndex
CREATE INDEX "university_modules_universityCourseId_year_semester_positio_idx" ON "university_modules"("universityCourseId", "year", "semester", "position");

-- CreateIndex
CREATE INDEX "university_modules_topicId_idx" ON "university_modules"("topicId");

-- CreateIndex
CREATE INDEX "module_progress_moduleId_idx" ON "module_progress"("moduleId");

-- CreateIndex
CREATE INDEX "university_editors_universityId_idx" ON "university_editors"("universityId");

-- CreateIndex
CREATE INDEX "edit_log_universityId_createdAt_idx" ON "edit_log"("universityId", "createdAt");

-- CreateIndex
CREATE INDEX "edit_log_entity_entityId_createdAt_idx" ON "edit_log"("entity", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_courses" ADD CONSTRAINT "university_courses_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_courses" ADD CONSTRAINT "university_courses_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_modules" ADD CONSTRAINT "university_modules_universityCourseId_fkey" FOREIGN KEY ("universityCourseId") REFERENCES "university_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_modules" ADD CONSTRAINT "university_modules_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "roadmap_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_progress" ADD CONSTRAINT "module_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_progress" ADD CONSTRAINT "module_progress_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "university_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_editors" ADD CONSTRAINT "university_editors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_editors" ADD CONSTRAINT "university_editors_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edit_log" ADD CONSTRAINT "edit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Same as the init migration: keep Supabase's public Data API away from these tables.
-- The app reaches them only through Prisma on the server.
ALTER TABLE "universities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "university_courses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "university_modules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "module_progress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "university_editors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "edit_log" ENABLE ROW LEVEL SECURITY;
