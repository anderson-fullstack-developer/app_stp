-- AlterTable
ALTER TABLE "audio_assets" ADD COLUMN     "sourceId" UUID,
ADD COLUMN     "sourceRef" TEXT;

-- AddForeignKey
ALTER TABLE "audio_assets" ADD CONSTRAINT "audio_assets_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
