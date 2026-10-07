import "dotenv/config";
import { randomUUID } from "node:crypto";
import { HttpException, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { App } from "supertest/types.js";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/configure-app.js";
import { loadEnv } from "../src/config/env.js";
import { CoursesService } from "../src/courses/courses.service.js";
import { PrismaService } from "../src/database/prisma.service.js";
import type { StoredQuestion } from "../src/lessons/lesson-rules.js";
import { LessonsService } from "../src/lessons/lessons.service.js";
import type { AuthUser } from "../src/users/users.service.js";

/** Contra a base de dados real (Neon); ignorado sem DATABASE_URL (CI). */
const dbUrl = process.env["DATABASE_URL"];

describe.skipIf(!dbUrl)(
  "Lições jogadas no servidor (e2e, base de dados real)",
  { timeout: 60_000 },
  () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let lessons: LessonsService;
    let user: AuthUser;
    let lessonIds: string[] = [];
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
      lessons = app.get(LessonsService);

      const u = await prisma.user.create({
        data: {
          email: `teste+licoes-${tag}@lingua-stp.invalid`,
          username: `teste_licoes_${tag}`,
          name: "Teste Lições",
          uiLocale: "pt",
          timezone: "Atlantic/Cape_Verde",
          roles: { create: { role: "USER" } },
          stats: { create: {} },
        },
      });
      user = { id: u.id, clerkId: `user_${tag}`, roles: [{ role: "USER", languageId: null }] };
      const course = await app.get(CoursesService).getCourse("kabuverdianu", "pt");
      lessonIds = course.units.flatMap((un) => un.lessons.map((l) => l.id));
    });

    afterAll(async () => {
      await prisma.user.deleteMany({ where: { id: user.id } }); // apaga em cascata tudo o resto
      await app.close();
    });

    const storedQuestions = async (attemptId: string) =>
      (await prisma.lessonAttempt.findUniqueOrThrow({ where: { id: attemptId } }))
        .questions as unknown as StoredQuestion[];
    const backdate = (attemptId: string) =>
      prisma.lessonAttempt.update({
        where: { id: attemptId },
        data: { startedAt: new Date(Date.now() - 5 * 60_000) },
      });
    const fail = (p: Promise<unknown>) =>
      p.then(
        () => null,
        (e: HttpException) => ({ status: e.getStatus(), body: e.getResponse() }),
      );

    async function playPerfectExceptFirst(attemptId: string) {
      const qs = await storedQuestions(attemptId);
      for (const [i, q] of qs.entries()) {
        if (i === 0) {
          const wrong = q.options.find((o) => o.id !== q.correctOptionId)!;
          const r = await lessons.answer(user, attemptId, {
            exerciseId: q.exerciseId,
            optionId: wrong.id,
          });
          expect(r).toMatchObject({ correct: false, round: 1, correctOptionId: q.correctOptionId });
        }
        const r = await lessons.answer(user, attemptId, {
          exerciseId: q.exerciseId,
          optionId: q.correctOptionId,
        });
        expect(r.correct).toBe(true);
      }
      return qs;
    }

    it("só a primeira lição está aberta; as seguintes estão bloqueadas", async () => {
      const p = await lessons.progress(user, "kabuverdianu");
      expect(p.lessons[0]).toMatchObject({ lessonId: lessonIds[0], state: "current" });
      expect(p.lessons[1]?.state).toBe("locked");
      const locked = await fail(lessons.start(user, lessonIds[1]!));
      expect(locked).toMatchObject({ status: 403, body: { code: "LESSON_LOCKED" } });
    });

    it("joga a 1.ª lição: o servidor corrige, paga XP/moedas, conta a streak e dá a conquista", async () => {
      const started = await lessons.start(user, lessonIds[0]!, "pt");
      expect(started.locale).toBe("pt");
      expect(started.questions.length).toBeGreaterThanOrEqual(4);
      expect(started.questions[0]).not.toHaveProperty("correctOptionId");

      const qs = await playPerfectExceptFirst(started.attemptId);
      // Pergunta já resolvida não aceita mais respostas.
      const again = await fail(
        lessons.answer(user, started.attemptId, {
          exerciseId: qs[0]!.exerciseId,
          optionId: qs[0]!.correctOptionId,
        }),
      );
      expect(again).toMatchObject({ status: 409, body: { code: "ALREADY_SOLVED" } });

      await backdate(started.attemptId);
      const res = await lessons.complete(user, started.attemptId);
      const total = qs.length;
      expect(res).toMatchObject({
        flagged: false,
        total,
        correctFirstTry: total - 1,
        firstCompletion: true,
        xp: (total - 1) * 10 + 30,
        coins: 5 + 10, // lição + conquista "primeira lição"
        streak: { current: 1, extendedToday: true },
        achievements: ["ACH_FIRST_LESSON"],
      });
      expect(res.level.leveledUp).toBe(res.xp >= 100);

      // Idempotente: concluir outra vez devolve o mesmo e não paga a dobrar.
      expect(await lessons.complete(user, started.attemptId)).toEqual(res);
      const stats = await prisma.userStats.findUniqueOrThrow({ where: { userId: user.id } });
      expect(stats).toMatchObject({
        xpTotal: res.xp,
        coins: 15,
        currentStreak: 1,
        lessonsCompleted: 1,
        correctAnswers: total - 1,
      });
      const xpSum = await prisma.xpEvent.aggregate({
        where: { userId: user.id },
        _sum: { amount: true },
      });
      expect(xpSum._sum.amount).toBe(stats.xpTotal); // livro-razão = totais
      const coinRows = await prisma.coinTransaction.findMany({
        where: { userId: user.id },
        orderBy: { balanceAfter: "asc" },
      });
      expect(coinRows.map((c) => c.balanceAfter)).toEqual([5, 15]);

      const p = await lessons.progress(user, "kabuverdianu");
      expect(p.lessons[0]?.state).toBe("completed");
      expect(p.lessons[1]?.state).toBe("current");
    });

    it("repetir uma lição dá metade do XP e nenhuma moeda", async () => {
      const before = await prisma.userStats.findUniqueOrThrow({ where: { userId: user.id } });
      const started = await lessons.start(user, lessonIds[0]!, "pt");
      const qs = await storedQuestions(started.attemptId);
      for (const q of qs) {
        await lessons.answer(user, started.attemptId, {
          exerciseId: q.exerciseId,
          optionId: q.correctOptionId,
        });
      }
      await backdate(started.attemptId);
      const res = await lessons.complete(user, started.attemptId);
      expect(res).toMatchObject({
        firstCompletion: false,
        xp: Math.round(qs.length * 10 * 0.5) + 15,
        coins: 0,
        streak: { current: 1, extendedToday: false },
      });
      const after = await prisma.userStats.findUniqueOrThrow({ where: { userId: user.id } });
      expect(after.coins).toBe(before.coins);
      expect(after.lessonsCompleted).toBe(1);
    });

    it("concluir depressa demais marca a tentativa e não paga", async () => {
      const before = await prisma.userStats.findUniqueOrThrow({ where: { userId: user.id } });
      const started = await lessons.start(user, lessonIds[1]!, "pt");
      const qs = await storedQuestions(started.attemptId);
      const notYet = await fail(lessons.complete(user, started.attemptId));
      expect(notYet).toMatchObject({ status: 422, body: { code: "LESSON_NOT_FINISHED" } });
      for (const q of qs) {
        await lessons.answer(user, started.attemptId, {
          exerciseId: q.exerciseId,
          optionId: q.correctOptionId,
        });
      }
      const res = await lessons.complete(user, started.attemptId);
      expect(res).toMatchObject({ flagged: true, xp: 0, coins: 0 });
      const after = await prisma.userStats.findUniqueOrThrow({ where: { userId: user.id } });
      expect(after.xpTotal).toBe(before.xpTotal);
      const p = await lessons.progress(user, "kabuverdianu");
      expect(p.lessons[1]?.state).toBe("current"); // não conta como concluída
    });
  },
);
