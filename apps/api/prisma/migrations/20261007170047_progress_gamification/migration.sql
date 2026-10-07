-- CreateEnum
CREATE TYPE "XpReason" AS ENUM ('ANSWER_CORRECT', 'LESSON_COMPLETE', 'LESSON_PERFECT', 'DAILY_CHALLENGE', 'ACHIEVEMENT', 'DUEL_WIN', 'ARENA_PLACE', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "CoinReason" AS ENUM ('LESSON_COMPLETE', 'DAILY_CHALLENGE', 'ACHIEVEMENT', 'REWARDED_AD', 'ARENA_PLACE', 'STREAK_FREEZE', 'SHOP_ITEM', 'PREMIUM_FREEZE', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ActivityDayKind" AS ENUM ('ACTIVE', 'FROZEN');

-- CreateEnum
CREATE TYPE "LessonProgressStatus" AS ENUM ('UNLOCKED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'ABANDONED');

-- CreateTable
CREATE TABLE "user_stats" (
    "userId" UUID NOT NULL,
    "xpTotal" INTEGER NOT NULL DEFAULT 0,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" DATE,
    "streakFreezes" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "lessonsCompleted" INTEGER NOT NULL DEFAULT 0,
    "timezoneChangedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_stats_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "xp_events" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "XpReason" NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "localDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_transactions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" "CoinReason" NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "localDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coin_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_days" (
    "userId" UUID NOT NULL,
    "localDate" DATE NOT NULL,
    "kind" "ActivityDayKind" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_days_pkey" PRIMARY KEY ("userId","localDate")
);

-- CreateTable
CREATE TABLE "lesson_progress" (
    "userId" UUID NOT NULL,
    "lessonId" UUID NOT NULL,
    "status" "LessonProgressStatus" NOT NULL DEFAULT 'UNLOCKED',
    "bestAccuracy" DOUBLE PRECISION,
    "completions" INTEGER NOT NULL DEFAULT 0,
    "firstCompletedAt" TIMESTAMP(3),
    "lastCompletedAt" TIMESTAMP(3),

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("userId","lessonId")
);

-- CreateTable
CREATE TABLE "lesson_attempts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "lessonId" UUID NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "exerciseIds" UUID[],
    "total" INTEGER NOT NULL,
    "correctFirstTry" INTEGER NOT NULL DEFAULT 0,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "lesson_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_attempt_answers" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "exerciseId" UUID NOT NULL,
    "round" INTEGER NOT NULL,
    "optionId" UUID,
    "text" TEXT,
    "correct" BOOLEAN NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_attempt_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "userId" UUID NOT NULL,
    "achievementKey" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("userId","achievementKey")
);

-- CreateTable
CREATE TABLE "reward_rules" (
    "key" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "dailyLimit" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_rules_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "xp_events_createdAt_idx" ON "xp_events"("createdAt");

-- CreateIndex
CREATE INDEX "xp_events_userId_createdAt_idx" ON "xp_events"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "xp_events_userId_reason_sourceType_sourceId_key" ON "xp_events"("userId", "reason", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "coin_transactions_userId_createdAt_idx" ON "coin_transactions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "coin_transactions_userId_reason_localDate_idx" ON "coin_transactions"("userId", "reason", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "coin_transactions_userId_reason_sourceType_sourceId_key" ON "coin_transactions"("userId", "reason", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "lesson_attempts_userId_lessonId_status_idx" ON "lesson_attempts"("userId", "lessonId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_attempt_answers_attemptId_exerciseId_round_key" ON "lesson_attempt_answers"("attemptId", "exerciseId", "round");

-- AddForeignKey
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_transactions" ADD CONSTRAINT "coin_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_days" ADD CONSTRAINT "activity_days_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_attempts" ADD CONSTRAINT "lesson_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_attempts" ADD CONSTRAINT "lesson_attempts_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_attempt_answers" ADD CONSTRAINT "lesson_attempt_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "lesson_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_attempt_answers" ADD CONSTRAINT "lesson_attempt_answers_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Regras de negócio garantidas também pela base de dados (docs/REGRAS_DE_NEGOCIO.md).
ALTER TABLE "user_stats"
  ADD CONSTRAINT "user_stats_coins_non_negative" CHECK ("coins" >= 0),
  ADD CONSTRAINT "user_stats_xp_non_negative" CHECK ("xpTotal" >= 0),
  ADD CONSTRAINT "user_stats_freezes_range" CHECK ("streakFreezes" BETWEEN 0 AND 2),
  ADD CONSTRAINT "user_stats_streak_non_negative" CHECK ("currentStreak" >= 0 AND "longestStreak" >= "currentStreak");
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "coin_transactions"
  ADD CONSTRAINT "coin_transactions_amount_non_zero" CHECK ("amount" <> 0),
  ADD CONSTRAINT "coin_transactions_balance_non_negative" CHECK ("balanceAfter" >= 0);
ALTER TABLE "lesson_attempts" ADD CONSTRAINT "lesson_attempts_counts" CHECK ("total" >= 1 AND "correctFirstTry" BETWEEN 0 AND "total");
-- No máximo 1 tentativa ativa por lição e utilizador.
CREATE UNIQUE INDEX "lesson_attempts_one_active" ON "lesson_attempts" ("userId", "lessonId") WHERE "status" = 'IN_PROGRESS';
