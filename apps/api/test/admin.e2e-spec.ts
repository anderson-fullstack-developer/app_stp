import "dotenv/config";
import { randomUUID } from "node:crypto";
import { HttpException, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { App } from "supertest/types.js";
import { AdminContentService } from "../src/admin/admin-content.service.js";
import { AdminUsersService } from "../src/admin/admin-users.service.js";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/configure-app.js";
import { loadEnv } from "../src/config/env.js";
import { ReviewService } from "../src/content/review.service.js";
import { PrismaService } from "../src/database/prisma.service.js";
import type { AuthUser } from "../src/users/users.service.js";

/** Contra a base de dados real (Neon); ignorado sem DATABASE_URL (CI). */
const dbUrl = process.env["DATABASE_URL"];
const LANG = "kabuverdianu";

describe.skipIf(!dbUrl)(
  "Painel de administração (e2e, base de dados real)",
  { timeout: 60_000 },
  () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let content: AdminContentService;
    let users: AdminUsersService;
    let review: ReviewService;
    const tag = randomUUID().slice(0, 8);
    const ids: string[] = [];
    let editor: AuthUser;
    let linguist: AuthUser;
    let admin: AuthUser;
    let superAdmin: AuthUser;
    let otherLangEditor: AuthUser;
    let plain: AuthUser;

    const makeUser = async (name: string, roles: AuthUser["roles"]): Promise<AuthUser> => {
      const u = await prisma.user.create({
        data: {
          email: `teste+admin-${name}-${tag}@lingua-stp.invalid`,
          username: `teste_admin_${name}_${tag}`,
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
      content = app.get(AdminContentService);
      users = app.get(AdminUsersService);
      review = app.get(ReviewService);
      editor = await makeUser("editor", [{ role: "CONTENT_EDITOR", languageId: LANG }]);
      linguist = await makeUser("linguist", [{ role: "LINGUIST", languageId: LANG }]);
      admin = await makeUser("admin", [{ role: "ADMIN", languageId: null }]);
      superAdmin = await makeUser("super", [{ role: "SUPER_ADMIN", languageId: null }]);
      otherLangEditor = await makeUser("forro", [{ role: "CONTENT_EDITOR", languageId: "forro" }]);
      plain = await makeUser("plain", []);
    });

    afterAll(async () => {
      const vocab = await prisma.vocabulary.findMany({
        where: { createdById: { in: ids } },
        select: { id: true },
      });
      await prisma.contentReview.deleteMany({ where: { actorId: { in: ids } } });
      await prisma.adminAuditLog.deleteMany({ where: { actorId: { in: ids } } });
      await prisma.vocabulary.deleteMany({ where: { id: { in: vocab.map((v) => v.id) } } });
      await prisma.phrase.deleteMany({ where: { createdById: { in: ids } } });
      await prisma.userRole.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await app.close();
    });

    const fail = (p: Promise<unknown>) =>
      p.then(
        () => null,
        (e: HttpException) => ({ status: e.getStatus(), body: e.getResponse() }),
      );

    it("o editor cria em rascunho; outra língua é recusada", async () => {
      const word = `teste-${tag}`;
      const created = await content.create(editor, "vocabulary", {
        languageId: LANG,
        text: word,
        translations: { pt: "palavra de teste", en: "test word" },
        partOfSpeech: "NOUN",
      });
      expect(created.status).toBe("DRAFT");

      const list = await content.list(editor, "vocabulary", { languageId: LANG, q: word });
      expect(list).toMatchObject([
        {
          id: created.id,
          text: word,
          status: "DRAFT",
          translations: { pt: "palavra de teste", en: "test word" },
          author: { id: editor.id },
        },
      ]);

      const dup = await fail(
        content.create(editor, "vocabulary", {
          languageId: LANG,
          text: word,
          translations: {},
          partOfSpeech: "NOUN",
        }),
      );
      expect(dup).toMatchObject({ status: 409, body: { code: "DUPLICATE" } });

      const wrong = await fail(
        content.create(otherLangEditor, "vocabulary", {
          languageId: LANG,
          text: `x-${tag}`,
          translations: {},
        }),
      );
      expect(wrong).toMatchObject({ status: 403, body: { code: "FORBIDDEN_LANGUAGE" } });
      expect(await content.list(otherLangEditor, "vocabulary", { languageId: LANG })).toEqual([]);
    });

    it("revisão: o autor não aprova, o linguista sim; aprovado já não se edita", async () => {
      const word = `fluxo-${tag}`;
      const { id } = await content.create(editor, "vocabulary", {
        languageId: LANG,
        text: word,
        translations: { pt: "fluxo" },
      });
      await content.update(editor, "vocabulary", id, {
        languageId: LANG,
        text: word,
        translations: { pt: "fluxo (corrigido)" },
      });
      await review.apply("vocabulary", id, "submit", editor);

      const own = await fail(review.apply("vocabulary", id, "approve", editor));
      expect(own).toMatchObject({ status: 403, body: { code: "AUTHOR_CANNOT_REVIEW" } });
      await review.apply("vocabulary", id, "approve", linguist, "Confirmado");

      const [row] = await content.list(linguist, "vocabulary", { languageId: LANG, q: word });
      expect(row).toMatchObject({
        status: "APPROVED",
        version: 2,
        translations: { pt: "fluxo (corrigido)" },
        reviewer: { id: linguist.id },
      });

      const locked = await fail(
        content.update(editor, "vocabulary", id, {
          languageId: LANG,
          text: word,
          translations: { pt: "outra" },
        }),
      );
      expect(locked).toMatchObject({ status: 422, body: { code: "NOT_EDITABLE" } });
    });

    it("frases e números do painel", async () => {
      const { id } = await content.create(linguist, "phrase", {
        languageId: LANG,
        text: `Frase de teste ${tag}`,
        translations: { en: "Test phrase" },
        notes: "Explicação",
        context: "Saudação",
      });
      const [row] = await content.list(admin, "phrase", { q: tag });
      expect(row).toMatchObject({ id, notes: "Explicação", translations: { en: "Test phrase" } });

      const o = await content.overview(admin);
      expect(o.content.vocabulary.APPROVED ?? 0).toBeGreaterThanOrEqual(1);
      expect(o.users.active).toBeGreaterThan(0);
    });

    it("papéis: admin dá linguista; só super admin dá admin; ninguém se tira o próprio admin", async () => {
      const g = await users.grant(admin, plain.id, "LINGUIST", LANG);
      const again = await users.grant(admin, plain.id, "LINGUIST", LANG);
      expect(again.id).toBe(g.id); // idempotente

      const notSuper = await fail(users.grant(admin, plain.id, "ADMIN", null));
      expect(notSuper).toMatchObject({ status: 403, body: { code: "SUPER_ADMIN_ONLY" } });
      const perLang = await fail(users.grant(admin, plain.id, "MODERATOR", LANG));
      expect(perLang).toMatchObject({ status: 400, body: { code: "ROLE_NOT_PER_LANGUAGE" } });

      const a = await users.grant(superAdmin, plain.id, "ADMIN", null);
      const listed = await users.list(`teste_admin_plain_${tag}`);
      expect(listed[0]?.roles.map((r) => r.role).sort()).toEqual(["ADMIN", "LINGUIST"]);
      expect(await fail(users.revoke(admin, a.id))).toMatchObject({ status: 403 });
      await users.revoke(superAdmin, a.id);
      await users.revoke(admin, g.id);

      const sRole = await prisma.userRole.create({
        data: { userId: superAdmin.id, role: "SUPER_ADMIN" },
      });
      const self = await fail(users.revoke(superAdmin, sRole.id));
      expect(self).toMatchObject({ status: 403, body: { code: "SELF_LOCKOUT" } });

      const audit = await prisma.adminAuditLog.count({
        where: { entityId: plain.id, action: { startsWith: "user.role_" } },
      });
      expect(audit).toBe(4);
    });

    it("suspender e reativar", async () => {
      await users.setStatus(admin, plain.id, "SUSPENDED");
      expect((await users.list(`teste_admin_plain_${tag}`))[0]?.status).toBe("SUSPENDED");
      await users.setStatus(admin, plain.id, "ACTIVE");
      const self = await fail(users.setStatus(admin, admin.id, "SUSPENDED"));
      expect(self).toMatchObject({ status: 403, body: { code: "SELF_MODERATION" } });
    });
  },
);
