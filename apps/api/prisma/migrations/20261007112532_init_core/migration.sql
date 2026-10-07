-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'MODERATOR', 'CONTENT_EDITOR', 'LINGUIST', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED');

-- CreateEnum
CREATE TYPE "LanguageStatus" AS ENUM ('COMING_SOON', 'BETA', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContentKind" AS ENUM ('COURSE', 'UNIT', 'LESSON', 'EXERCISE', 'VOCABULARY', 'PHRASE', 'AUDIO');

-- CreateEnum
CREATE TYPE "ReviewAction" AS ENUM ('SUBMITTED', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('MULTIPLE_CHOICE', 'LISTEN_AND_CHOOSE', 'LISTEN_AND_TYPE', 'TRANSLATE', 'MATCH_WORDS', 'ORDER_WORDS', 'IMAGE_SELECT', 'PRONUNCIATION', 'TRUE_FALSE');

-- CreateEnum
CREATE TYPE "PartOfSpeech" AS ENUM ('NOUN', 'PROPER_NOUN', 'VERB', 'ADJECTIVE', 'ADVERB', 'PRONOUN', 'PREPOSITION', 'CONJUNCTION', 'INTERJECTION', 'NUMERAL', 'DETERMINER', 'ARTICLE', 'PARTICLE', 'PHRASE', 'OTHER');

-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "languages" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "altName" TEXT,
    "isoCode" TEXT,
    "region" TEXT,
    "orthography" TEXT,
    "status" "LanguageStatus" NOT NULL DEFAULT 'COMING_SOON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "language_variants" (
    "id" UUID NOT NULL,
    "languageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,

    CONSTRAINT "language_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "clerkId" TEXT,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarColor" TEXT,
    "countryCode" TEXT,
    "spokenLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "uiLocale" TEXT NOT NULL DEFAULT 'pt',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Lisbon',
    "learningLanguageId" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "languageId" TEXT,
    "grantedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "license" TEXT NOT NULL,
    "licenseUrl" TEXT,
    "attribution" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "languageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'EASY',
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 5,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" UUID NOT NULL,
    "languageId" TEXT NOT NULL,
    "lessonId" UUID,
    "type" "ExerciseType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "payload" JSONB,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'EASY',
    "usage" TEXT[] DEFAULT ARRAY['learning']::TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID NOT NULL,
    "reviewedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_options" (
    "id" UUID NOT NULL,
    "exerciseId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "exercise_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocabulary" (
    "id" UUID NOT NULL,
    "languageId" TEXT NOT NULL,
    "variantId" UUID,
    "word" TEXT NOT NULL,
    "partOfSpeech" "PartOfSpeech" NOT NULL DEFAULT 'OTHER',
    "category" TEXT,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'EASY',
    "notes" TEXT,
    "sourceId" UUID,
    "sourceRef" TEXT,
    "audioId" UUID,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID NOT NULL,
    "reviewedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vocabulary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocabulary_translations" (
    "id" UUID NOT NULL,
    "vocabularyId" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isSuggestion" BOOLEAN NOT NULL DEFAULT true,
    "origin" TEXT NOT NULL DEFAULT 'linguist',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vocabulary_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phrases" (
    "id" UUID NOT NULL,
    "languageId" TEXT NOT NULL,
    "variantId" UUID,
    "text" TEXT NOT NULL,
    "context" TEXT,
    "explanation" TEXT,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'EASY',
    "sourceId" UUID,
    "sourceRef" TEXT,
    "audioId" UUID,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID NOT NULL,
    "reviewedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phrases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phrase_translations" (
    "id" UUID NOT NULL,
    "phraseId" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isSuggestion" BOOLEAN NOT NULL DEFAULT true,
    "origin" TEXT NOT NULL DEFAULT 'linguist',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phrase_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_assets" (
    "id" UUID NOT NULL,
    "languageId" TEXT NOT NULL,
    "variantId" UUID,
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "durationMs" INTEGER,
    "speakerName" TEXT,
    "region" TEXT,
    "consentRecorded" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audio_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_reviews" (
    "id" UUID NOT NULL,
    "contentKind" "ContentKind" NOT NULL,
    "contentId" UUID NOT NULL,
    "action" "ReviewAction" NOT NULL,
    "comment" TEXT,
    "actorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "languages_countryId_idx" ON "languages"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "language_variants_languageId_name_key" ON "language_variants"("languageId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "user_roles_role_idx" ON "user_roles"("role");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_role_languageId_key" ON "user_roles"("userId", "role", "languageId");

-- CreateIndex
CREATE UNIQUE INDEX "sources_name_key" ON "sources"("name");

-- CreateIndex
CREATE INDEX "courses_languageId_status_idx" ON "courses"("languageId", "status");

-- CreateIndex
CREATE INDEX "units_courseId_order_idx" ON "units"("courseId", "order");

-- CreateIndex
CREATE INDEX "lessons_unitId_order_idx" ON "lessons"("unitId", "order");

-- CreateIndex
CREATE INDEX "lessons_status_idx" ON "lessons"("status");

-- CreateIndex
CREATE INDEX "exercises_languageId_status_idx" ON "exercises"("languageId", "status");

-- CreateIndex
CREATE INDEX "exercises_lessonId_order_idx" ON "exercises"("lessonId", "order");

-- CreateIndex
CREATE INDEX "exercise_options_exerciseId_idx" ON "exercise_options"("exerciseId");

-- CreateIndex
CREATE INDEX "vocabulary_languageId_status_idx" ON "vocabulary"("languageId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "vocabulary_languageId_word_partOfSpeech_key" ON "vocabulary"("languageId", "word", "partOfSpeech");

-- CreateIndex
CREATE UNIQUE INDEX "vocabulary_translations_vocabularyId_locale_key" ON "vocabulary_translations"("vocabularyId", "locale");

-- CreateIndex
CREATE INDEX "phrases_languageId_status_idx" ON "phrases"("languageId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "phrase_translations_phraseId_locale_key" ON "phrase_translations"("phraseId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "audio_assets_storageKey_key" ON "audio_assets"("storageKey");

-- CreateIndex
CREATE INDEX "audio_assets_languageId_status_idx" ON "audio_assets"("languageId", "status");

-- CreateIndex
CREATE INDEX "content_reviews_contentKind_contentId_idx" ON "content_reviews"("contentKind", "contentId");

-- CreateIndex
CREATE INDEX "admin_audit_logs_entityType_entityId_idx" ON "admin_audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "admin_audit_logs_createdAt_idx" ON "admin_audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "languages" ADD CONSTRAINT "languages_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "language_variants" ADD CONSTRAINT "language_variants_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_learningLanguageId_fkey" FOREIGN KEY ("learningLanguageId") REFERENCES "languages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "languages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_options" ADD CONSTRAINT "exercise_options_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary" ADD CONSTRAINT "vocabulary_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary" ADD CONSTRAINT "vocabulary_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "language_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary" ADD CONSTRAINT "vocabulary_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary" ADD CONSTRAINT "vocabulary_audioId_fkey" FOREIGN KEY ("audioId") REFERENCES "audio_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary" ADD CONSTRAINT "vocabulary_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary" ADD CONSTRAINT "vocabulary_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary_translations" ADD CONSTRAINT "vocabulary_translations_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phrases" ADD CONSTRAINT "phrases_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phrases" ADD CONSTRAINT "phrases_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "language_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phrases" ADD CONSTRAINT "phrases_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phrases" ADD CONSTRAINT "phrases_audioId_fkey" FOREIGN KEY ("audioId") REFERENCES "audio_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phrases" ADD CONSTRAINT "phrases_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phrases" ADD CONSTRAINT "phrases_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phrase_translations" ADD CONSTRAINT "phrase_translations_phraseId_fkey" FOREIGN KEY ("phraseId") REFERENCES "phrases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_assets" ADD CONSTRAINT "audio_assets_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_assets" ADD CONSTRAINT "audio_assets_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "language_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_assets" ADD CONSTRAINT "audio_assets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
