import "dotenv/config";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import type { App } from "supertest/types.js";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/configure-app.js";
import { loadEnv } from "../src/config/env.js";

/**
 * Testes contra a base de dados real (Neon). Só correm quando DATABASE_URL existe
 * (no PC de desenvolvimento); no CI, sem base de dados, são ignorados.
 */
const dbUrl = process.env["DATABASE_URL"];

describe.skipIf(!dbUrl)("Línguas e vocabulário (e2e, base de dados real)", () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const env = loadEnv({ NODE_ENV: "test", DATABASE_URL: dbUrl });
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.register(env)],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app, env);
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it("health indica a base de dados ligada", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/health").expect(200);
    expect(res.body.database).toBe("ok");
  });

  it("lista países e línguas com o estado (Kriolu em Beta)", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/languages").expect(200);
    const cv = res.body.find((c: { id: string }) => c.id === "cv");
    const kea = cv.languages.find((l: { id: string }) => l.id === "kabuverdianu");
    expect(kea).toMatchObject({ status: "BETA", beta: true, available: true });
  });

  it("vocabulário Beta vem marcado como não revisto, com significado no idioma pedido", async () => {
    const pt = await request(app.getHttpServer())
      .get("/api/v1/languages/kabuverdianu/vocabulary?locale=pt&take=20")
      .expect(200);
    expect(pt.body.language.beta).toBe(true);
    expect(pt.body.items).toHaveLength(20);
    expect(pt.body.items.every((i: { reviewed: boolean }) => i.reviewed === false)).toBe(true);
    expect(
      pt.body.items.some((i: { meaning: { locale: string } | null }) => i.meaning?.locale === "pt"),
    ).toBe(true);
    expect(pt.body.nextCursor).toBeTruthy();

    const next = await request(app.getHttpServer())
      .get(
        `/api/v1/languages/kabuverdianu/vocabulary?locale=en&take=20&cursor=${pt.body.nextCursor}`,
      )
      .expect(200);
    expect(next.body.items[0].id).not.toBe(pt.body.items[0].id);
  });

  it("língua ativa sem conteúdo aprovado não expõe rascunhos", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/languages/forro/vocabulary")
      .expect(200);
    expect(res.body.items).toEqual([]);
  });

  it("línguas em breve e pedidos inválidos são recusados", async () => {
    await request(app.getHttpServer()).get("/api/v1/languages/angolar/vocabulary").expect(404);
    const bad = await request(app.getHttpServer())
      .get("/api/v1/languages/kabuverdianu/vocabulary?take=1000")
      .expect(400);
    expect(bad.body.code).toBe("VALIDATION_FAILED");
  });
});
