import "dotenv/config";
import { randomUUID } from "node:crypto";
import { HttpException, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { App } from "supertest/types.js";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/configure-app.js";
import { loadEnv } from "../src/config/env.js";
import { PrismaService } from "../src/database/prisma.service.js";
import { ShopService } from "../src/shop/shop.service.js";
import type { AuthUser } from "../src/users/users.service.js";

/** Contra a base de dados real (Neon); ignorado sem DATABASE_URL (CI). */
const dbUrl = process.env["DATABASE_URL"];

describe.skipIf(!dbUrl)(
  "Loja: proteção de streak (e2e, base de dados real)",
  { timeout: 60_000 },
  () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let shop: ShopService;
    let me: AuthUser;
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
      shop = app.get(ShopService);
      const u = await prisma.user.create({
        data: {
          email: `teste+loja-${tag}@lingua-stp.invalid`,
          username: `teste_loja_${tag}`,
          name: "Teste Loja",
          stats: { create: { coins: 450 } },
        },
      });
      me = { id: u.id, clerkId: "", roles: [] } as unknown as AuthUser;
    });

    afterAll(async () => {
      await prisma.user.deleteMany({ where: { id: me.id } });
      await app.close();
    });

    const fail = (p: Promise<unknown>) =>
      p.then(
        () => null,
        (e: HttpException) => ({ status: e.getStatus(), body: e.getResponse() }),
      );

    it("mostra o saldo e o preço", async () => {
      const o = await shop.overview(me);
      expect(o.coins).toBe(450);
      expect(o.items[0]).toMatchObject({
        id: "streak_freeze",
        price: 200,
        owned: 0,
        max: 2,
        canBuy: true,
      });
    });

    it("compra, repetir o mesmo pedido não cobra duas vezes, máximo de 2", async () => {
      const req = randomUUID();
      const first = await shop.buyStreakFreeze(me, req);
      expect(first).toEqual({ coins: 250, streakFreezes: 1, charged: 200 });
      const again = await shop.buyStreakFreeze(me, req);
      expect(again).toEqual({ coins: 250, streakFreezes: 1, charged: 0 });

      const second = await shop.buyStreakFreeze(me, randomUUID());
      expect(second).toMatchObject({ coins: 50, streakFreezes: 2 });

      const limit = await fail(shop.buyStreakFreeze(me, randomUUID()));
      expect(limit).toMatchObject({ status: 409, body: { code: "FREEZE_LIMIT" } });

      const ledger = await prisma.coinTransaction.findMany({
        where: { userId: me.id, reason: "STREAK_FREEZE" },
      });
      expect(ledger.map((l) => l.amount)).toEqual([-200, -200]);
      expect(ledger.map((l) => l.balanceAfter).sort()).toEqual([250, 50].sort());
    });

    it("sem saldo é recusado e o saldo não muda", async () => {
      await prisma.userStats.update({ where: { userId: me.id }, data: { streakFreezes: 0 } });
      const r = await fail(shop.buyStreakFreeze(me, randomUUID()));
      expect(r).toMatchObject({ status: 409, body: { code: "NOT_ENOUGH_COINS" } });
      const stats = await prisma.userStats.findUniqueOrThrow({ where: { userId: me.id } });
      expect(stats).toMatchObject({ coins: 50, streakFreezes: 0 });
      expect((await shop.overview(me)).items[0]?.canBuy).toBe(false);
    });
  },
);
