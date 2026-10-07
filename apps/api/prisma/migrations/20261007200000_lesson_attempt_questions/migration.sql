-- AlterTable
ALTER TABLE "lesson_attempts" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'pt',
ADD COLUMN     "questions" JSONB,
ADD COLUMN     "result" JSONB;

