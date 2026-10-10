import "dotenv/config";
import { randomUUID } from "node:crypto";
import { HttpException, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { App } from "supertest/types.js";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/configure-app.js";
import { loadEnv } from "../src/config/env.js";
import { PrismaService } from "../src/database/prisma.service.js";
import { RankingService } from "../src/social/ranking.service.js";
import { SocialService } from "../src/social/social.service.js";
import type { AuthUser } from "../src/users/users.service.js";

/** Contra a base de dados real (Neon); ignorado sem DATABASE_URL (CI). */
const dbUrl = process.env["DATABASE_URL"];

describe.skipIf(!dbUrl)("Amigos e rankings (e2e, base de dados real)", { timeout: 60_000 }, () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let social: SocialService;
  let rankings: RankingService;
  const tag = randomUUID().slice(0, 8);
  const ids: string[] = [];
  let ana: AuthUser;
  let bruno: AuthUser;
  let carla: AuthUser;

  const makeUser = async (name: string, xpThisWeek: number) => {
    const u = await prisma.user.create({
      data: {
        clerkId: `user_social_${name}_${tag}`,
        email: `teste+social-${name}-${tag}@lingua-stp.invalid`,
        username: `teste_social_${name}_${tag}`,
        name: `Teste ${name}`,
        stats: { create: { xpTotal: xpThisWeek } },
      },
    });
    ids.push(u.id);
    if (xpThisWeek > 0) {
      await prisma.xpEvent.create({
        data: {
          userId: u.id,
          amount: xpThisWeek,
          reason: "ADMIN_ADJUSTMENT",
          sourceType: "test",
          sourceId: tag,
          localDate: new Date(),
        },
      });
    }
    return { id: u.id, clerkId: u.clerkId!, roles: [] } as AuthUser;
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
    social = app.get(SocialService);
    rankings = app.get(RankingService);
    ana = await makeUser("ana", 30);
    bruno = await makeUser("bruno", 50);
    carla = await makeUser("carla", 0);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  const fail = (p: Promise<unknown>) =>
    p.then(
      () => null,
      (e: HttpException) => ({ status: e.getStatus(), body: e.getResponse() }),
    );

  it("pesquisa por @username (sem mim) e mostra a relação", async () => {
    const found = await social.search(ana, `@teste_social_bruno_${tag}`);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ id: bruno.id, relationship: "none" });
    expect(await social.search(ana, "a")).toEqual([]); // menos de 2 letras
    const self = await social.search(ana, `teste_social_ana_${tag}`);
    expect(self).toEqual([]);
  });

  it("pedido → pendente; repetir é idempotente; o inverso aceita sozinho", async () => {
    const r1 = await social.sendRequest(ana, bruno.id);
    expect(r1.status).toBe("pending_out");
    const again = await social.sendRequest(ana, bruno.id);
    expect(again).toEqual(r1);

    const seenByBruno = await social.search(bruno, `teste_social_ana_${tag}`);
    expect(seenByBruno[0]?.relationship).toBe("pending_in");
    const listB = await social.list(bruno);
    expect(listB.incoming.map((i) => i.user.id)).toEqual([ana.id]);

    const r2 = await social.sendRequest(bruno, ana.id);
    expect(r2.status).toBe("friends");
    const listA = await social.list(ana);
    expect(listA.friends).toMatchObject([{ id: bruno.id, weeklyXp: 50 }]);

    const dup = await fail(social.sendRequest(ana, bruno.id));
    expect(dup).toMatchObject({ status: 409, body: { code: "ALREADY_FRIENDS" } });
    const self = await fail(social.sendRequest(ana, ana.id));
    expect(self).toMatchObject({ status: 400, body: { code: "SELF_REQUEST" } });
  });

  it("recusar, cancelar e aceitar", async () => {
    const r = await social.sendRequest(carla, ana.id);
    await social.decline(ana, r.requestId!); // quem recebe recusa
    expect((await social.list(ana)).incoming).toEqual([]);

    const r2 = await social.sendRequest(carla, ana.id);
    await social.decline(carla, r2.requestId!); // quem enviou cancela
    expect((await social.list(carla)).outgoing).toEqual([]);

    const r3 = await social.sendRequest(carla, ana.id);
    expect(await fail(social.accept(carla, r3.requestId!))).toMatchObject({ status: 404 });
    await social.accept(ana, r3.requestId!);
    const notPending = await fail(social.decline(ana, r3.requestId!));
    expect(notPending).toMatchObject({ status: 403, body: { code: "NOT_PENDING" } });
    expect((await social.list(ana)).friends.map((f) => f.id)).toEqual([bruno.id, carla.id]);
  });

  it("ranking de amigos e semanal: ordem por XP, eu sempre incluído", async () => {
    const friends = await rankings.ranking(carla, "friends");
    // Carla é amiga da Ana, não do Bruno.
    expect(friends.top.map((e) => [e.userId, e.xp, e.position])).toEqual([
      [ana.id, 30, 1],
      [carla.id, 0, 2],
    ]);
    expect(friends.me).toMatchObject({ userId: carla.id, isMe: true });

    const ofAna = await rankings.ranking(ana, "friends");
    expect(ofAna.top.map((e) => e.userId)).toEqual([bruno.id, ana.id, carla.id]);

    const weekly = await rankings.ranking(ana, "weekly");
    expect(weekly.weekStart).not.toBeNull();
    expect(weekly.me?.xp).toBe(30);
    const global = await rankings.ranking(ana, "global");
    expect(global.weekStart).toBeNull();
    expect(global.me?.xp).toBeGreaterThanOrEqual(30);
  });

  it("ranking do país precisa de país no perfil", async () => {
    const r = await fail(rankings.ranking(ana, "country"));
    expect(r).toMatchObject({ status: 422, body: { code: "NO_COUNTRY" } });
    await prisma.user.update({ where: { id: ana.id }, data: { countryCode: "st" } });
    const country = await rankings.ranking(ana, "country");
    expect(country.me).toMatchObject({ userId: ana.id, xp: 30 });
  });

  it("remover amigo e bloquear", async () => {
    await social.remove(carla, ana.id);
    expect((await social.list(carla)).friends).toEqual([]);

    await social.block(bruno, ana.id);
    expect((await social.list(ana)).friends).toEqual([]); // bloquear desfaz a amizade
    expect(await social.search(ana, `teste_social_bruno_${tag}`)).toEqual([]);
    expect(await social.search(bruno, `teste_social_ana_${tag}`)).toEqual([]);
    const blocked = await fail(social.sendRequest(ana, bruno.id));
    expect(blocked).toMatchObject({ status: 404 });

    await social.unblock(bruno, ana.id);
    expect(await social.search(ana, `teste_social_bruno_${tag}`)).toHaveLength(1);
    const self = await fail(social.block(ana, ana.id));
    expect(self).toMatchObject({ status: 400, body: { code: "SELF_BLOCK" } });
  });
});
