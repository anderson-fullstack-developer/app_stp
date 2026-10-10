import { ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { loadRewardTable, lockStats } from "../progress/grant.js";
import { isValidTimeZone, localDate } from "../progress/rules/local-date.js";
import { MAX_STREAK_FREEZES } from "../progress/rules/streak.js";
import type { AuthUser } from "../users/users.service.js";

/**
 * Loja (docs/REGRAS_DE_NEGOCIO.md §5): por agora só a proteção de streak, paga com moedas.
 * O servidor decide tudo: preço (tabela de recompensas), saldo e máximo de 2 guardadas.
 * Não é possível comprar moedas.
 */
@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService) {}

  private async freezePrice(): Promise<number> {
    const table = await loadRewardTable(this.prisma);
    return table.get("STREAK_FREEZE_PRICE")?.coins ?? 200;
  }

  async overview(user: AuthUser) {
    const [stats, price] = await Promise.all([
      this.prisma.userStats.findUnique({ where: { userId: user.id } }),
      this.freezePrice(),
    ]);
    const coins = stats?.coins ?? 0;
    const owned = stats?.streakFreezes ?? 0;
    return {
      coins,
      items: [
        {
          id: "streak_freeze" as const,
          price,
          owned,
          max: MAX_STREAK_FREEZES,
          canBuy: owned < MAX_STREAK_FREEZES && coins >= price,
        },
      ],
    };
  }

  /**
   * Comprar uma proteção de streak. `requestId` (gerado pelo cliente) torna a compra
   * idempotente: repetir o mesmo pedido (duplo toque, rede instável) não cobra duas vezes.
   */
  async buyStreakFreeze(user: AuthUser, requestId: string, now = new Date()) {
    const price = await this.freezePrice();
    return this.prisma.$transaction(async (tx) => {
      const userRow = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { timezone: true },
      });
      const stats = await lockStats(tx, user.id);
      const done = await tx.coinTransaction.findUnique({
        where: {
          userId_reason_sourceType_sourceId: {
            userId: user.id,
            reason: "STREAK_FREEZE",
            sourceType: "shop",
            sourceId: requestId,
          },
        },
      });
      if (done) {
        return { coins: stats.coins, streakFreezes: stats.streakFreezes, charged: 0 };
      }
      if (stats.streakFreezes >= MAX_STREAK_FREEZES) {
        throw new ConflictException({
          code: "FREEZE_LIMIT",
          message: `Já tens ${MAX_STREAK_FREEZES} proteções guardadas.`,
        });
      }
      if (stats.coins < price) {
        throw new ConflictException({
          code: "NOT_ENOUGH_COINS",
          message: "Não tens moedas suficientes.",
        });
      }
      const tz = isValidTimeZone(userRow.timezone) ? userRow.timezone : "Europe/Lisbon";
      const coins = stats.coins - price;
      await tx.coinTransaction.create({
        data: {
          userId: user.id,
          amount: -price,
          balanceAfter: coins,
          reason: "STREAK_FREEZE",
          sourceType: "shop",
          sourceId: requestId,
          localDate: new Date(`${localDate(now, tz)}T00:00:00Z`),
        },
      });
      const updated = await tx.userStats.update({
        where: { userId: user.id },
        data: { coins, streakFreezes: { increment: 1 } },
      });
      return { coins: updated.coins, streakFreezes: updated.streakFreezes, charged: price };
    });
  }
}
