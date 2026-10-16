-- CreateEnum
CREATE TYPE "VoiceTaskKind" AS ENUM ('RECORD', 'REVIEW');

-- CreateEnum
CREATE TYPE "VoiceTaskStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "recording_reviews" ADD COLUMN     "taskId" UUID;

-- AlterTable
ALTER TABLE "recordings" ADD COLUMN     "taskId" UUID;

-- AlterTable
ALTER TABLE "voice_contributors" ADD COLUMN     "paused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payoutDetails" TEXT,
ADD COLUMN     "payoutMethod" TEXT;

-- CreateTable
CREATE TABLE "voice_tasks" (
    "id" UUID NOT NULL,
    "kind" "VoiceTaskKind" NOT NULL,
    "assigneeId" UUID NOT NULL,
    "languageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "target" INTEGER NOT NULL,
    "rateCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "unitId" UUID,
    "dueAt" TIMESTAMP(3),
    "status" "VoiceTaskStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "voice_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_payouts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,

    CONSTRAINT "voice_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "voice_tasks_assigneeId_status_idx" ON "voice_tasks"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "voice_tasks_status_createdAt_idx" ON "voice_tasks"("status", "createdAt");

-- CreateIndex
CREATE INDEX "voice_payouts_userId_paidAt_idx" ON "voice_payouts"("userId", "paidAt");

-- CreateIndex
CREATE INDEX "recording_reviews_taskId_idx" ON "recording_reviews"("taskId");

-- CreateIndex
CREATE INDEX "recordings_taskId_idx" ON "recordings"("taskId");

-- AddForeignKey
ALTER TABLE "voice_tasks" ADD CONSTRAINT "voice_tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_tasks" ADD CONSTRAINT "voice_tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_tasks" ADD CONSTRAINT "voice_tasks_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_tasks" ADD CONSTRAINT "voice_tasks_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_payouts" ADD CONSTRAINT "voice_payouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_payouts" ADD CONSTRAINT "voice_payouts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "voice_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recording_reviews" ADD CONSTRAINT "recording_reviews_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "voice_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
