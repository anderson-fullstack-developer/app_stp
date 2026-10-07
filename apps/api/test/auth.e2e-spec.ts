import "dotenv/config";
import { createHmac, randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import type { App } from "supertest/types.js";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/configure-app.js";
import { loadEnv } from "../src/config/env.js";
import { PrismaService } from "../src/database/prisma.service.js";
import { ProgressService } from "../src/progress/progress.service.js";

/** Segredo fictício só para os testes (formato whsec_<base64>). */
const SECRET = `whsec_${Buffer.from("segredo-de-teste-do-webhook").toString("base64")}`;

async function startApp(overrides: Record<string, string | undefined> = {}) {
  const env = loadEnv({ NODE_ENV: "test", CLERK_WEBHOOK_SIGNING_SECRET: SECRET, ...overrides });
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.register(env)],
  }).compile();
  const app: INestApplication<App> = moduleRef.createNestApplication({ rawBody: true });
  configureApp(app, env);
  await app.init();
  return app;
}

/** Assina como o Clerk/Svix (Standard Webhooks): HMAC-SHA256 de "id.timestamp.corpo". */
function signed(payload: unknown, secret = SECRET) {
  const body = JSON.stringify(payload);
  const id = `msg_${randomUUID()}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const key = Buffer.from(secret.slice("whsec_".length), "base64");
  const signature = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
  return {
    body,
    headers: {
      "content-type": "application/json",
      "svix-id": id,
      "svix-timestamp": timestamp,
      "svix-signature": `v1,${signature}`,
    },
  };
}

function post(app: INestApplication<App>, payload: unknown, secret?: string) {
  const { body, headers } = signed(payload, secret);
  return request(app.getHttpServer()).post("/api/v1/webhooks/clerk").set(headers).send(body);
}

describe("Autenticação e webhook do Clerk (e2e)", () => {
  let app: INestApplication<App>;
  beforeAll(async () => {
    app = await startApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it("/me sem sessão responde 401 com código estável", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/me").expect(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });

  it("/me sem Clerk configurado responde 503", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/me")
      .set("authorization", "Bearer qualquer")
      .expect(503);
    expect(res.body.code).toBe("AUTH_NOT_CONFIGURED");
  });

  it("recusa webhooks sem assinatura ou com assinatura errada", async () => {
    const semAssinatura = await request(app.getHttpServer())
      .post("/api/v1/webhooks/clerk")
      .send({ type: "user.created", data: {} })
      .expect(400);
    expect(semAssinatura.body.code).toBe("INVALID_SIGNATURE");

    const outroSegredo = `whsec_${Buffer.from("outro").toString("base64")}`;
    await post(app, { type: "user.created", data: {} }, outroSegredo).expect(400);
  });

  it("aceita um evento assinado corretamente (eventos não usados são ignorados)", async () => {
    const res = await post(app, { type: "session.created", object: "event", data: {} }).expect(200);
    expect(res.body).toEqual({ received: true, type: "session.created" });
  });

  it("sem segredo configurado o webhook responde 503", async () => {
    const semSegredo = await startApp({ CLERK_WEBHOOK_SIGNING_SECRET: undefined });
    await post(semSegredo, { type: "user.created", data: {} }).expect(503);
    await semSegredo.close();
  });
});

const dbUrl = process.env["DATABASE_URL"];

describe.skipIf(!dbUrl)("Webhook do Clerk → Neon (e2e, base de dados real)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const clerkId = `user_teste_${randomUUID().slice(0, 8)}`;
  const email = `teste+${clerkId}@lingua-stp.invalid`;

  beforeAll(async () => {
    app = await startApp({ DATABASE_URL: dbUrl });
    prisma = app.get(PrismaService);
  });
  afterAll(async () => {
    // Limpeza caso algum teste falhe a meio (o último já apaga a linha anonimizada).
    await prisma.user.deleteMany({ where: { OR: [{ clerkId }, { email }] } });
    await app.close();
  });

  const userData = (extra: Record<string, unknown> = {}) => ({
    id: clerkId,
    object: "user",
    first_name: "Teste",
    last_name: "Automático",
    username: null,
    primary_email_address_id: "e1",
    email_addresses: [{ id: "e1", email_address: email }],
    unsafe_metadata: {
      countryCode: "cv",
      spokenLanguages: ["pt"],
      uiLocale: "en",
      learningLanguageId: "kabuverdianu",
    },
    ...extra,
  });

  it("user.created cria o utilizador com o perfil do onboarding e o papel USER", async () => {
    await post(app, { type: "user.created", object: "event", data: userData() }).expect(200);
    const u = await prisma.user.findUniqueOrThrow({ where: { clerkId }, include: { roles: true } });
    expect(u).toMatchObject({
      email,
      name: "Teste Automático",
      countryCode: "cv",
      spokenLanguages: ["pt"],
      uiLocale: "en",
      learningLanguageId: "kabuverdianu",
      status: "ACTIVE",
    });
    expect(u.roles.map((r) => r.role)).toEqual(["USER"]);
  });

  it("o utilizador novo começa com progresso a zero, calculado no seu fuso", async () => {
    const u = await prisma.user.findUniqueOrThrow({ where: { clerkId } });
    const summary = await app.get(ProgressService).summary(u.id);
    expect(summary).toMatchObject({
      xpTotal: 0,
      coins: 0,
      level: { level: 1, nextLevelXp: 100 },
      streak: { current: 0, longest: 0, freezes: 0, activeToday: false },
    });
    expect(summary.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Streak ativa ontem, nada hoje: continua visível; há 3 dias sem proteções: perdida.
    const yesterday = new Date(Date.now() - 86_400_000);
    await prisma.userStats.update({
      where: { userId: u.id },
      data: { currentStreak: 4, longestStreak: 4, lastActiveDate: yesterday, xpTotal: 260 },
    });
    const kept = await app.get(ProgressService).summary(u.id);
    expect(kept.level.level).toBe(3);
    expect([4, 0]).toContain(kept.streak.current); // 4, salvo à volta da meia-noite local
    await prisma.userStats.update({
      where: { userId: u.id },
      data: { lastActiveDate: new Date(Date.now() - 3 * 86_400_000) },
    });
    expect((await app.get(ProgressService).summary(u.id)).streak.current).toBe(0);
  });

  it("user.updated atualiza a identidade sem apagar o perfil", async () => {
    await post(app, {
      type: "user.updated",
      object: "event",
      data: userData({ first_name: "Nome Novo", unsafe_metadata: {} }),
    }).expect(200);
    const u = await prisma.user.findUniqueOrThrow({ where: { clerkId } });
    expect(u.name).toBe("Nome Novo Automático");
    expect(u.countryCode).toBe("cv");
  });

  it("user.deleted anonimiza a conta", async () => {
    const before = await prisma.user.findUniqueOrThrow({ where: { clerkId } });
    await post(app, {
      type: "user.deleted",
      object: "event",
      data: { id: clerkId, object: "user", deleted: true },
    }).expect(200);
    const u = await prisma.user.findUniqueOrThrow({
      where: { id: before.id },
      include: { roles: true },
    });
    expect(u).toMatchObject({
      clerkId: null,
      status: "DELETED",
      name: "Conta eliminada",
      countryCode: null,
    });
    expect(u.email).not.toContain(clerkId);
    expect(u.roles).toEqual([]);
    await prisma.user.delete({ where: { id: u.id } });
  });
});
