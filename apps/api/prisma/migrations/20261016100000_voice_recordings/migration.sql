-- CreateEnum
CREATE TYPE "RecordingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewVerdict" AS ENUM ('APPROVE', 'REJECT');

-- CreateEnum
CREATE TYPE "RejectReason" AS ENUM ('PRONUNCIATION', 'NOISE', 'WRONG_WORD', 'CUT_OFF', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'VOICE_SPEAKER';
ALTER TYPE "Role" ADD VALUE 'VOICE_LISTENER';

-- CreateTable
CREATE TABLE "voice_contributors" (
    "userId" UUID NOT NULL,
    "displayName" TEXT,
    "region" TEXT,
    "adultConfirmed" BOOLEAN NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_contributors_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "recordings" (
    "id" UUID NOT NULL,
    "vocabularyId" UUID NOT NULL,
    "languageId" TEXT NOT NULL,
    "speakerId" UUID NOT NULL,
    "region" TEXT,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "status" "RecordingStatus" NOT NULL DEFAULT 'PENDING',
    "approvals" INTEGER NOT NULL DEFAULT 0,
    "rejections" INTEGER NOT NULL DEFAULT 0,
    "audioId" UUID,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recordings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recording_reviews" (
    "id" UUID NOT NULL,
    "recordingId" UUID NOT NULL,
    "listenerId" UUID NOT NULL,
    "verdict" "ReviewVerdict" NOT NULL,
    "reason" "RejectReason",
    "isControl" BOOLEAN NOT NULL DEFAULT false,
    "matched" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recording_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recordings_storageKey_key" ON "recordings"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "recordings_audioId_key" ON "recordings"("audioId");

-- CreateIndex
CREATE INDEX "recordings_status_languageId_createdAt_idx" ON "recordings"("status", "languageId", "createdAt");

-- CreateIndex
CREATE INDEX "recordings_speakerId_createdAt_idx" ON "recordings"("speakerId", "createdAt");

-- CreateIndex
CREATE INDEX "recordings_vocabularyId_idx" ON "recordings"("vocabularyId");

-- CreateIndex
CREATE INDEX "recording_reviews_listenerId_createdAt_idx" ON "recording_reviews"("listenerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "recording_reviews_recordingId_listenerId_key" ON "recording_reviews"("recordingId", "listenerId");

-- AddForeignKey
ALTER TABLE "voice_contributors" ADD CONSTRAINT "voice_contributors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_audioId_fkey" FOREIGN KEY ("audioId") REFERENCES "audio_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recording_reviews" ADD CONSTRAINT "recording_reviews_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "recordings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recording_reviews" ADD CONSTRAINT "recording_reviews_listenerId_fkey" FOREIGN KEY ("listenerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
