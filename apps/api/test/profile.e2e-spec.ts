import "dotenv/config";
import { randomUUID } from "node:crypto";
import { HttpException, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { App } from "supertest/types.js";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/configure-app.js";
import { loadEnv } from "../src/config/env.js";
import { PrismaService } from "../src/database/prisma.service.js";
import { ClerkService } from "../src/auth/clerk.service.js";
import { MeController } from "../src/users/me.controller.js";
import { UsersService } from "../src/users/users.service.js";

/** Contra a base de dados real (Neon); ignorado sem DATABASE_URL (CI). */
const dbUrl = process.env["DATABASE_URL"];

describe.skipIf(!dbUrl)("Atualizar o perfil (e2e, base de dados real)", { timeout: 60_000 }, () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let users: UsersService;
  let userId = "";
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
    users = app.get(UsersService);
    userId = (
      await prisma.user.create({
        data: {
          email: `teste+perfil-${tag}@lingua-stp.invalid`,
          username: `teste_perfil_${tag}`,
          name: "Teste Perfil",
          stats: { create: {} },
        },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
    await app.close();
  });

  const fail = (p: Promise<unknown>) =>
    p.then(
      () => null,
      (e: HttpException) => ({ status: e.getStatus(), body: e.getResponse() }),
    );

  it("muda idioma, língua a aprender e línguas faladas", async () => {
    const p = await users.updateProfile(userId, {
      uiLocale: "en",
      learningLanguageId: "kabuverdianu",
      spokenLanguages: ["pt", "en"],
      countryCode: "cv",
      name: "Nome Novo",
    });
    expect(p).toMatchObject({
      uiLocale: "en",
      learningLanguageId: "kabuverdianu",
      spokenLanguages: ["pt", "en"],
      countryCode: "cv",
      name: "Nome Novo",
    });
  });

  it("recusa línguas que ainda não estão disponíveis", async () => {
    const r = await fail(users.updateProfile(userId, { learningLanguageId: "angolar" }));
    expect(r).toMatchObject({ status: 422, body: { code: "LANGUAGE_NOT_AVAILABLE" } });
  });

  it("fuso horário: válido, e no máximo uma mudança por dia", async () => {
    const bad = await fail(users.updateProfile(userId, { timezone: "Marte/Olympus" }));
    expect(bad).toMatchObject({ status: 422, body: { code: "INVALID_TIMEZONE" } });

    const ok = await users.updateProfile(userId, { timezone: "Atlantic/Cape_Verde" });
    expect(ok.timezone).toBe("Atlantic/Cape_Verde");
    // Repetir o mesmo fuso não conta como mudança.
    await expect(
      users.updateProfile(userId, { timezone: "Atlantic/Cape_Verde" }),
    ).resolves.toBeTruthy();

    const again = await fail(users.updateProfile(userId, { timezone: "Africa/Sao_Tome" }));
    expect(again).toMatchObject({ status: 409, body: { code: "TIMEZONE_CHANGE_LIMIT" } });

    const tomorrow = new Date(Date.now() + 25 * 60 * 60 * 1000);
    const later = await users.updateProfile(userId, { timezone: "Africa/Sao_Tome" }, tomorrow);
    expect(later.timezone).toBe("Africa/Sao_Tome");
  });

  it("eliminar a conta: apaga no Clerk e anonimiza os dados", async () => {
    const clerkId = `user_apagar_${tag}`;
    const victim = await prisma.user.create({
      data: {
        clerkId,
        email: `teste+apagar-${tag}@lingua-stp.invalid`,
        username: `teste_apagar_${tag}`,
        name: "Para Apagar",
        countryCode: "st",
        roles: { create: { role: "USER" } },
      },
    });
    const deleteUser = vi.spyOn(app.get(ClerkService), "deleteUser").mockResolvedValue();
    await app.get(MeController).remove({ id: victim.id, clerkId, roles: [] });
    expect(deleteUser).toHaveBeenCalledWith(clerkId);
    const after = await prisma.user.findUniqueOrThrow({
      where: { id: victim.id },
      include: { roles: true },
    });
    expect(after).toMatchObject({
      status: "DELETED",
      clerkId: null,
      name: "Conta eliminada",
      countryCode: null,
    });
    expect(after.email).not.toContain("apagar");
    expect(after.roles).toEqual([]);
    await prisma.user.delete({ where: { id: victim.id } });
  });
});
