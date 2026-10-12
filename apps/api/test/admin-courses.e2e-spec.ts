import "dotenv/config";
import { randomUUID } from "node:crypto";
import { HttpException, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { App } from "supertest/types.js";
import { AdminContentService } from "../src/admin/admin-content.service.js";
import { AdminCoursesService } from "../src/admin/admin-courses.service.js";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/configure-app.js";
import { loadEnv } from "../src/config/env.js";
import { ReviewService } from "../src/content/review.service.js";
import { PrismaService } from "../src/database/prisma.service.js";
import { loadQuizItems } from "../src/lessons/quiz-items.js";
import type { AuthUser } from "../src/users/users.service.js";

/** Contra a base de dados real (Neon); ignorado sem DATABASE_URL (CI). */
const dbUrl = process.env["DATABASE_URL"];
const LANG = "forro"; // ainda "em breve": constrói-se o curso sem nada chegar à app

describe.skipIf(!dbUrl)(
  "Painel: construir um curso (e2e, base de dados real)",
  { timeout: 60_000 },
  () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let courses: AdminCoursesService;
    let content: AdminContentService;
    let review: ReviewService;
    const tag = randomUUID().slice(0, 8);
    const ids: string[] = [];
    const created = { course: "", unit: "", lesson: "", vocab: "", exercise: "" };
    let editor: AuthUser;
    let linguist: AuthUser;
    let outsider: AuthUser;

    const makeUser = async (name: string, roles: AuthUser["roles"]): Promise<AuthUser> => {
      const u = await prisma.user.create({
        data: {
          email: `teste+cursos-${name}-${tag}@lingua-stp.invalid`,
          username: `teste_cursos_${name}_${tag}`,
          name: `Teste ${name}`,
        },
      });
      ids.push(u.id);
      return { id: u.id, clerkId: "", roles };
    };

    beforeAll(async () => {
      const env = loadEnv({ NODE_ENV: "test", DATABASE_URL: dbUrl });
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule.register(env)],
      }).compile();
      app = moduleRef.createNestApplication();
      configureApp(app, env);
      await app.init();
      prisma = app.get(PrismaService);
      courses = app.get(AdminCoursesService);
      content = app.get(AdminContentService);
      review = app.get(ReviewService);
      editor = await makeUser("editor", [{ role: "CONTENT_EDITOR", languageId: LANG }]);
      linguist = await makeUser("linguist", [{ role: "LINGUIST", languageId: LANG }]);
      outsider = await makeUser("outsider", [
        { role: "CONTENT_EDITOR", languageId: "kabuverdianu" },
      ]);
    });

    afterAll(async () => {
      await prisma.contentReview.deleteMany({ where: { actorId: { in: ids } } });
      await prisma.adminAuditLog.deleteMany({ where: { actorId: { in: ids } } });
      await prisma.exercise.deleteMany({ where: { createdById: { in: ids } } });
      await prisma.lesson.deleteMany({ where: { createdById: { in: ids } } });
      if (created.course) await prisma.course.deleteMany({ where: { id: created.course } });
      await prisma.vocabulary.deleteMany({ where: { createdById: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await app.close();
    });

    const fail = (p: Promise<unknown>) =>
      p.then(
        () => null,
        (e: HttpException) => ({ status: e.getStatus(), body: e.getResponse() }),
      );

    it("o editor cria curso, unidade e lição (em rascunho); outra língua não", async () => {
      created.course = (
        await courses.createCourse(editor, { languageId: LANG, title: `Curso ${tag}` })
      ).id;
      created.unit = (
        await courses.createUnit(editor, {
          courseId: created.course,
          title: "Saudações",
          icon: "👋",
        })
      ).id;
      const lesson = await courses.createLesson(editor, {
        unitId: created.unit,
        title: "Olá e adeus",
        estimatedMinutes: 4,
      });
      expect(lesson.status).toBe("DRAFT");
      created.lesson = lesson.id;

      const tree = await courses.tree(editor, LANG);
      const mine = tree.find((c) => c.id === created.course)!;
      expect(mine).toMatchObject({ status: "DRAFT", units: [{ title: "Saudações", icon: "👋" }] });
      expect(mine.units[0]!.lessons[0]).toMatchObject({ title: "Olá e adeus", exercises: 0 });

      expect(await fail(courses.tree(outsider, LANG))).toMatchObject({
        status: 403,
        body: { code: "FORBIDDEN_LANGUAGE" },
      });
    });

    it("palavras na lição: duplicado e língua errada recusados", async () => {
      created.vocab = (
        await content.create(editor, "vocabulary", {
          languageId: LANG,
          text: `palavra-${tag}`,
          translations: { pt: "palavra de teste" },
        })
      ).id;
      created.exercise = (await courses.addWord(editor, created.lesson, created.vocab)).id;
      expect(await fail(courses.addWord(editor, created.lesson, created.vocab))).toMatchObject({
        status: 409,
        body: { code: "DUPLICATE" },
      });
      const kea = await prisma.vocabulary.findFirstOrThrow({
        where: { languageId: "kabuverdianu" },
        select: { id: true },
      });
      expect(await fail(courses.addWord(editor, created.lesson, kea.id))).toMatchObject({
        status: 422,
        body: { code: "WRONG_LANGUAGE" },
      });
      const lesson = await courses.lesson(editor, created.lesson);
      expect(lesson.exercises).toMatchObject([
        { id: created.exercise, status: "DRAFT", vocabulary: { word: `palavra-${tag}` } },
      ]);
    });

    it("não se aprova o exercício antes da palavra; leituras públicas escondem palavras por aprovar", async () => {
      await review.apply("exercise", created.exercise, "submit", editor);
      const early = await fail(review.apply("exercise", created.exercise, "approve", linguist));
      expect(early).toMatchObject({ status: 422, body: { code: "VOCABULARY_NOT_APPROVED" } });

      // Defesa em profundidade: mesmo um exercício aprovado à força não mostra a palavra.
      await prisma.exercise.update({
        where: { id: created.exercise },
        data: { status: "APPROVED" },
      });
      expect(await loadQuizItems(prisma, { lessonId: created.lesson }, "pt", ["APPROVED"])).toEqual(
        [],
      );
      await prisma.exercise.update({
        where: { id: created.exercise },
        data: { status: "UNDER_REVIEW" },
      });

      await review.apply("vocabulary", created.vocab, "submit", editor);
      await review.apply("vocabulary", created.vocab, "approve", linguist);
      await review.apply("exercise", created.exercise, "approve", linguist);
      const items = await loadQuizItems(prisma, { lessonId: created.lesson }, "pt", ["APPROVED"]);
      expect(items.map((i) => i.word)).toEqual([`palavra-${tag}`]);
      expect(await fail(courses.removeExercise(editor, created.exercise))).toMatchObject({
        status: 422,
        body: { code: "NOT_EDITABLE" },
      });
    });

    it("lição em revisão não se edita (mas a ordem sim); fila de revisão por língua", async () => {
      await review.apply("lesson", created.lesson, "submit", editor);
      const locked = await fail(courses.updateLesson(editor, created.lesson, { title: "Outro" }));
      expect(locked).toMatchObject({ status: 422, body: { code: "NOT_EDITABLE" } });
      await courses.updateLesson(editor, created.lesson, { order: 3 });

      const queue = await courses.reviewItems(linguist, "UNDER_REVIEW");
      expect(queue.lessons.map((l) => l.id)).toContain(created.lesson);
      const other = await courses.reviewItems(outsider, "UNDER_REVIEW");
      expect(other.lessons.map((l) => l.id)).not.toContain(created.lesson);
    });

    it("só linguistas publicam cursos e unidades; ordem dos exercícios", async () => {
      const denied = await fail(
        courses.updateContainer(editor, "course", created.course, { status: "APPROVED" }),
      );
      expect(denied).toMatchObject({ status: 403, body: { code: "FORBIDDEN_ROLE" } });
      await courses.updateContainer(linguist, "course", created.course, { status: "APPROVED" });
      await courses.updateContainer(linguist, "unit", created.unit, { status: "APPROVED" });
      const tree = await courses.tree(linguist, LANG);
      expect(tree.find((c) => c.id === created.course)).toMatchObject({
        status: "APPROVED",
        units: [{ status: "APPROVED" }],
      });

      const bad = await fail(courses.reorder(editor, created.lesson, [randomUUID()]));
      expect(bad).toMatchObject({ status: 422, body: { code: "INVALID_ORDER" } });
      expect(await courses.reorder(editor, created.lesson, [created.exercise])).toEqual({
        ok: true,
      });
    });
  },
);
