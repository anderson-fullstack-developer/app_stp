-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" UUID,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "units" ADD COLUMN     "icon" TEXT,
ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_unitId_slug_key" ON "lessons"("unitId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "units_courseId_slug_key" ON "units"("courseId", "slug");

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

