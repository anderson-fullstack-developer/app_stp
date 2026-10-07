-- CreateTable
CREATE TABLE "daily_challenges" (
    "id" UUID NOT NULL,
    "languageId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "exerciseIds" UUID[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_challenge_attempts" (
    "id" UUID NOT NULL,
    "challengeId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "locale" TEXT NOT NULL DEFAULT 'pt',
    "questions" JSONB NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '[]',
    "total" INTEGER NOT NULL,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "result" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "daily_challenge_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_challenges_languageId_date_key" ON "daily_challenges"("languageId", "date");

-- CreateIndex
CREATE INDEX "daily_challenge_attempts_challengeId_status_correct_duratio_idx" ON "daily_challenge_attempts"("challengeId", "status", "correct", "durationMs");

-- CreateIndex
CREATE UNIQUE INDEX "daily_challenge_attempts_challengeId_userId_key" ON "daily_challenge_attempts"("challengeId", "userId");

-- AddForeignKey
ALTER TABLE "daily_challenges" ADD CONSTRAINT "daily_challenges_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_challenge_attempts" ADD CONSTRAINT "daily_challenge_attempts_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "daily_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_challenge_attempts" ADD CONSTRAINT "daily_challenge_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Regras garantidas pela base de dados.
ALTER TABLE "daily_challenge_attempts"
  ADD CONSTRAINT "daily_attempts_counts" CHECK ("total" >= 1 AND "correct" BETWEEN 0 AND "total");
