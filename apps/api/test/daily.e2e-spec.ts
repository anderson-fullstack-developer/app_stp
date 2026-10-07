import "dotenv/config";
import { randomUUID } from "node:crypto";
import { HttpException, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { App } from "supertest/types.js";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/configure-app.js";
import { loadEnv } from "../src/config/env.js";
import { DailyService } from "../src/daily/daily.service.js";
import { PrismaService } from "../src/database/prisma.service.js";
import type { StoredQuestion } from "../src/lessons/lesson-rules.js";
import type { AuthUser } from "../src/users/users.service.js";

/** Contra a base de dados real (Neon); ignorado sem DATABASE_URL (CI). */
const dbUrl = process.env["DATABASE_URL"];

describe.skipIf(!dbUrl)("Desafio do dia (e2e, base de dados real)", { timeout: 60_000 }, () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let daily: DailyService;
  let user: AuthUser;
  const tag = randomUUID().slice(0, 8);

  beforeAll(async () => {
    const env = loadEnv({ NODE_ENV: "test", DATABASE_URL: dbUrl });
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.register(env)],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app, env);
    await app.init();
    prisma = app.get(PrismaService);
    daily = app.get(DailyService);
    const u = await prisma.user.create({
      data: {
        email: `teste+diario-${tag}@lingua-stp.invalid`,
        username: `teste_diario_${tag}`,
        name: "Teste Diário",
        uiLocale: "pt",
        timezone: "Africa/Sao_Tome",
        roles: { create: { role: "USER" } },
        stats: { create: {} },
      },
    });
    user = { id: u.id, clerkId: `user_${tag}`, roles: [{ role: "USER", languageId: null }] };
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: user.id } });
    await app.close();
  });

  const fail = (p: Promise<unknown>) =>
    p.then(
      () => null,
      (e: HttpException) => ({ status: e.getStatus(), body: e.getResponse() }),
    );

  it("o desafio de hoje tem 5 perguntas, iguais para todos", async () => {
    const a = await daily.today("kabuverdianu");
    const b = await daily.today("kabuverdianu");
    expect(a.challenge.exerciseIds).toHaveLength(5);
    expect(b.challenge.id).toBe(a.challenge.id);
    const o = await daily.overview(user, "kabuverdianu");
    expect(o).toMatchObject({ questions: 5, xpReward: 50, coinReward: 10, me: null });
  });

  it("joga uma vez: uma resposta por pergunta, recompensa, ranking e sem segunda tentativa", async () => {
    const started = await daily.start(user, "kabuverdianu", "pt");
    expect(started.questions).toHaveLength(5);
    expect(started.questions[0]).not.toHaveProperty("correctOptionId");

    // Retomar devolve a mesma tentativa.
    expect((await daily.start(user, "kabuverdianu", "pt")).attemptId).toBe(started.attemptId);

    const stored = (
      await prisma.dailyChallengeAttempt.findUniqueOrThrow({ where: { id: started.attemptId } })
    ).questions as unknown as StoredQuestion[];

    const early = await fail(daily.complete(user, started.attemptId));
    expect(early).toMatchObject({ status: 422, body: { code: "DAILY_NOT_FINISHED" } });

    for (const [i, q] of stored.entries()) {
      const option =
        i === 0 ? q.options.find((o) => o.id !== q.correctOptionId)! : { id: q.correctOptionId };
      const r = await daily.answer(user, started.attemptId, {
        exerciseId: q.exerciseId,
        optionId: option.id,
      });
      expect(r.correct).toBe(i !== 0);
    }
    const again = await fail(
      daily.answer(user, started.attemptId, {
        exerciseId: stored[0]!.exerciseId,
        optionId: stored[0]!.correctOptionId,
      }),
    );
    expect(again).toMatchObject({ status: 409, body: { code: "ALREADY_ANSWERED" } });

    await prisma.dailyChallengeAttempt.update({
      where: { id: started.attemptId },
      data: { startedAt: new Date(Date.now() - 60_000) },
    });
    const res = await daily.complete(user, started.attemptId);
    expect(res).toMatchObject({
      flagged: false,
      total: 5,
      correct: 4,
      rewarded: true,
      xp: 50,
      coins: 10,
      streak: { current: 1, extendedToday: true },
    });
    expect(res.rank).toBeGreaterThanOrEqual(1);
    expect(await daily.complete(user, started.attemptId)).toMatchObject({ xp: 50, rank: res.rank });

    const stats = await prisma.userStats.findUniqueOrThrow({ where: { userId: user.id } });
    expect(stats).toMatchObject({ xpTotal: 50, coins: 10, currentStreak: 1, correctAnswers: 4 });

    const second = await fail(daily.start(user, "kabuverdianu", "pt"));
    expect(second).toMatchObject({ status: 409, body: { code: "DAILY_DONE" } });

    const ranking = await daily.ranking(user, "kabuverdianu");
    expect(ranking.me).toMatchObject({ isMe: true, correct: 4, position: res.rank });
    const overview = await daily.overview(user, "kabuverdianu");
    expect(overview.me).toMatchObject({ status: "COMPLETED", correct: 4, rank: res.rank });
    expect(overview.participants).toBeGreaterThanOrEqual(1);
  });
});
