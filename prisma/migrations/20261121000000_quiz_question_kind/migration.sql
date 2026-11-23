-- Quiz questions gain the fields content/quiz.json uses: a hint, single/multi choice,
-- and the most options a multi-choice question allows.
-- AlterTable
ALTER TABLE "quiz_questions" ADD COLUMN     "help" TEXT,
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'single',
ADD COLUMN     "maxChoices" INTEGER;
