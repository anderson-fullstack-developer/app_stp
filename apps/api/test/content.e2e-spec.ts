import "dotenv/config";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { HttpException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import type { App } from "supertest/types.js";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/configure-app.js";
import { loadEnv } from "../src/config/env.js";
import { ReviewService } from "../src/content/review.service.js";
import { PrismaService } from "../src/database/prisma.service.js";
import type { AuthUser } from "../src/users/users.service.js";

/** Contra a base de dados real (Neon); ignorado sem DATABASE_URL (CI). */
const dbUrl = process.env["DATABASE_URL"];

describe.skipIf(!dbUrl)("Cursos e revisão de conteúdo (e2e, base de dados real)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let reviews: ReviewService;
  const tag = randomUUID().slice(0, 8);
  const ids = { creator: "", linguist: "", vocab: "" };

  beforeAll(async () => {
    const env = loadEnv({ NODE_ENV: "test", DATABASE_URL: dbUrl });
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.register(env)],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app, env);
    await app.init();
    prisma = app.get(PrismaService);
    reviews = app.get(ReviewService);

    const mk = (name: string, role: "CONTENT_EDITOR" | "LINGUIST") =>
      prisma.user.create({
        data: {
          email: `teste+${name}-${tag}@lingua-stp.invalid`,
          username: `teste_${name}_${tag}`,
          name: `Teste ${name}`,
          roles: { create: { role, languageId: "kabuverdianu" } },
        },
      });
    ids.creator = (await mk("autor", "CONTENT_EDITOR")).id;
    ids.linguist = (await mk("linguista", "LINGUIST")).id;
    // Ficha de teste, claramente marcada e apagada no fim — nunca chega à app (é DRAFT).
    ids.vocab = (
      await prisma.vocabulary.create({
        data: {
          languageId: "kabuverdianu",
          word: `__teste_${tag}__`,
          partOfSpeech: "OTHER",
          createdById: ids.creator,
        },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma.contentReview.deleteMany({ where: { contentId: ids.vocab } });
    await prisma.adminAuditLog.deleteMany({ where: { entityId: ids.vocab } });
    await prisma.vocabulary.deleteMany({ where: { id: ids.vocab } });
    await prisma.user.deleteMany({ where: { id: { in: [ids.creator, ids.linguist] } } });
    await app.close();
  });

  const actor = (id: string, role: "CONTENT_EDITOR" | "LINGUIST"): AuthUser => ({
    id,
    clerkId: `user_${id}`,
    roles: [{ role, languageId: "kabuverdianu" }],
  });

  it("devolve o curso de Kriolu (Beta) com lições jogáveis no idioma pedido", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/languages/kabuverdianu/course?locale=pt")
      .expect(200);
    expect(res.body.language.beta).toBe(true);
    expect(res.body.units.length).toBeGreaterThanOrEqual(5);
    const first = res.body.units[0];
    expect(first).toMatchObject({ slug: "numbers", reviewed: false });
    expect(first.lessons[0]).toMatchObject({ slug: "numbers-1", playable: true, reviewed: false });
    expect(first.lessons[0].questions).toBeGreaterThanOrEqual(4);
  });

  it("línguas sem curso ou ainda não disponíveis respondem 404", async () => {
    await request(app.getHttpServer()).get("/api/v1/languages/forro/course").expect(404);
    await request(app.getHttpServer()).get("/api/v1/languages/angolar/course").expect(404);
  });

  it("as ações de revisão exigem sessão", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/content/vocabulary/${ids.vocab}/approve`)
      .expect(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });

  it("fluxo completo: autor submete, autor NÃO aprova, linguista aprova", async () => {
    const author = actor(ids.creator, "CONTENT_EDITOR");
    const linguist = actor(ids.linguist, "LINGUIST");

    await expect(reviews.apply("vocabulary", ids.vocab, "submit", author)).resolves.toMatchObject({
      status: "UNDER_REVIEW",
    });

    const own = await reviews.apply("vocabulary", ids.vocab, "approve", author).catch((e) => e);
    expect(own).toBeInstanceOf(HttpException);
    expect((own as HttpException).getStatus()).toBe(403);
    expect((own as HttpException).getResponse()).toMatchObject({ code: "AUTHOR_CANNOT_REVIEW" });

    await expect(
      reviews.apply("vocabulary", ids.vocab, "approve", linguist, "Confirmado por falante."),
    ).resolves.toMatchObject({ from: "UNDER_REVIEW", status: "APPROVED" });
    const v = await prisma.vocabulary.findUniqueOrThrow({ where: { id: ids.vocab } });
    expect(v).toMatchObject({ status: "APPROVED", reviewedById: ids.linguist });
    expect(v.approvedAt).toBeInstanceOf(Date);

    const again = await reviews.apply("vocabulary", ids.vocab, "approve", linguist).catch((e) => e);
    expect((again as HttpException).getStatus()).toBe(422);

    const history = await reviews.history("vocabulary", ids.vocab);
    expect(history.map((h) => h.action)).toEqual(["SUBMITTED", "APPROVED"]);
    expect(history[1]?.comment).toBe("Confirmado por falante.");
    expect(await prisma.adminAuditLog.count({ where: { entityId: ids.vocab } })).toBe(2);
  });
});
