import "dotenv/config";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AdminInsightsService } from "../src/admin/admin-insights.service.js";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/configure-app.js";
import { loadEnv } from "../src/config/env.js";

/** Contra a base de dados real (Neon); ignorado sem DATABASE_URL (CI). Só leitura. */
const dbUrl = process.env["DATABASE_URL"];

describe.skipIf(!dbUrl)("Dados reais do painel (e2e, só leitura)", { timeout: 60_000 }, () => {
  let app: INestApplication;
  let insights: AdminInsightsService;

  beforeAll(async () => {
    const env = loadEnv({ NODE_ENV: "test", DATABASE_URL: dbUrl });
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.register(env)],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app, env);
    await app.init();
    insights = app.get(AdminInsightsService);
  });
  afterAll(() => app.close());

  it("línguas com contagens", async () => {
    const langs = await insights.languages();
    const kriolu = langs.find((l) => l.id === "kabuverdianu");
    expect(kriolu).toMatchObject({ status: "BETA" });
    expect(kriolu!.words).toBeGreaterThan(0);
    expect(kriolu!.lessons).toBeGreaterThan(0);
  });

  it("partidas, desafios, rankings e conquistas", async () => {
    const m = await insights.matches();
    expect(m.perDay).toHaveLength(30);
    expect(m.kpis.total).toBeGreaterThanOrEqual(m.kpis.finished);
    expect(Array.isArray(await insights.daily())).toBe(true);
    const r = await insights.rankings();
    expect(r.weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const a = await insights.achievements();
    expect(a.achievements.length).toBeGreaterThan(5);
  });

  it("analytics: séries de 30 dias, retenção e KPIs", async () => {
    const a = await insights.analytics();
    for (const s of [a.dau, a.signups, a.lessons, a.xp]) expect(s).toHaveLength(30);
    expect(a.kpis.users).toBeGreaterThan(0);
    expect(a.kpis.mau).toBeGreaterThanOrEqual(a.kpis.wau);
    expect(a.retention.map((r) => r.day)).toEqual(expect.arrayContaining([1, 7]));
  });

  it("auditoria, regras e pesquisa", async () => {
    expect(Array.isArray(await insights.audit(20))).toBe(true);
    expect((await insights.rewardRules()).length).toBeGreaterThan(0);
    const s = await insights.search("kri");
    expect(s).toHaveProperty("words");
  });
});
