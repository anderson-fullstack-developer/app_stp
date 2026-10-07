-- AlterTable
ALTER TABLE "exercises" ADD COLUMN     "vocabularyId" UUID;

-- CreateIndex
CREATE INDEX "exercises_vocabularyId_idx" ON "exercises"("vocabularyId");

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Dados: liga os exercícios de vocabulário já existentes à palavra (antes só no payload JSON).
UPDATE "exercises"
SET "vocabularyId" = ("payload"->>'vocabularyId')::uuid
WHERE "vocabularyId" IS NULL AND "payload" ? 'vocabularyId';
