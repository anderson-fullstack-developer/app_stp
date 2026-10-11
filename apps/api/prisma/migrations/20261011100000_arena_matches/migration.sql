-- CreateEnum
CREATE TYPE "ArenaMatchStatus" AS ENUM ('IN_PROGRESS', 'FINISHED', 'CANCELLED');

-- CreateTable
CREATE TABLE "arena_matches" (
    "id" UUID NOT NULL,
    "roomCode" TEXT,
    "mode" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "hostId" UUID,
    "lives" INTEGER NOT NULL,
    "seconds" INTEGER NOT NULL,
    "status" "ArenaMatchStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "rounds" INTEGER NOT NULL DEFAULT 0,
    "rewarded" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "arena_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arena_match_players" (
    "matchId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "place" INTEGER,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "wrong" INTEGER NOT NULL DEFAULT 0,
    "timeouts" INTEGER NOT NULL DEFAULT 0,
    "left" BOOLEAN NOT NULL DEFAULT false,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "coins" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "arena_match_players_pkey" PRIMARY KEY ("matchId","userId")
);

-- CreateIndex
CREATE INDEX "arena_matches_startedAt_idx" ON "arena_matches"("startedAt");

-- CreateIndex
CREATE INDEX "arena_match_players_userId_idx" ON "arena_match_players"("userId");

-- AddForeignKey
ALTER TABLE "arena_matches" ADD CONSTRAINT "arena_matches_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arena_matches" ADD CONSTRAINT "arena_matches_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arena_match_players" ADD CONSTRAINT "arena_match_players_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "arena_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arena_match_players" ADD CONSTRAINT "arena_match_players_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Regras de integridade
ALTER TABLE "arena_matches" ADD CONSTRAINT "arena_matches_lives_check" CHECK ("lives" BETWEEN 1 AND 10);
ALTER TABLE "arena_matches" ADD CONSTRAINT "arena_matches_seconds_check" CHECK ("seconds" BETWEEN 3 AND 60);
ALTER TABLE "arena_match_players" ADD CONSTRAINT "arena_match_players_rewards_check" CHECK ("xp" >= 0 AND "coins" >= 0);
