import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import type { App } from "supertest/types.js";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/configure-app.js";
import { type Env, loadEnv } from "../src/config/env.js";

async function startApp(overrides: Record<string, string> = {}) {
  const env: Env = loadEnv({ NODE_ENV: "test", ...overrides });
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.register(env)],
  }).compile();
  const app: INestApplication<App> = moduleRef.createNestApplication();
  configureApp(app, env);
  await app.init();
  return app;
}

describe("API (e2e)", () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await startApp({ APP_VERSION: "1.2.3" });
  });
  afterAll(async () => {
    await app.close();
  });

  it("GET /api/v1/health responde que está viva", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/health").expect(200);
    expect(res.body).toMatchObject({ status: "ok", version: "1.2.3", environment: "test" });
    expect(typeof res.body.uptimeSeconds).toBe("number");
  });

  it("rotas inexistentes devolvem o formato de erro uniforme", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/nao-existe").expect(404);
    expect(res.body).toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
      path: "/api/v1/nao-existe",
    });
    expect(res.body.timestamp).toBeTruthy();
    expect(JSON.stringify(res.body)).not.toContain("stack");
  });

  it("envia cabeçalhos de segurança (Helmet)", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("CORS: autoriza só as origens configuradas", async () => {
    const ok = await request(app.getHttpServer())
      .get("/api/v1/health")
      .set("Origin", "http://localhost:8080");
    expect(ok.headers["access-control-allow-origin"]).toBe("http://localhost:8080");
    const blocked = await request(app.getHttpServer())
      .get("/api/v1/health")
      .set("Origin", "https://site-malicioso.example");
    expect(blocked.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("documentação da API disponível fora de produção", async () => {
    await request(app.getHttpServer()).get("/api/docs").expect(200);
  });
});

describe("API (e2e) — limites", () => {
  it("responde 429 com código estável quando o limite de pedidos é excedido", async () => {
    const app = await startApp({ RATE_LIMIT_PER_MINUTE: "3" });
    const server = app.getHttpServer();
    for (let i = 0; i < 3; i++) await request(server).get("/api/v1/health").expect(200);
    const res = await request(server).get("/api/v1/health").expect(429);
    expect(res.body.code).toBe("TOO_MANY_REQUESTS");
    await app.close();
  });

  it("não expõe a documentação em produção", async () => {
    const app = await startApp({
      NODE_ENV: "production",
      // URL fictício: a base de dados nunca é contactada neste teste.
      DATABASE_URL: "postgresql://teste:teste@localhost:5432/teste",
    });
    await request(app.getHttpServer()).get("/api/docs").expect(404);
    await app.close();
  });
});
