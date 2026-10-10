import { Injectable, UnprocessableEntityException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { levelForXp } from "../progress/rules/levels.js";
import { isoWeekStartUtc } from "../progress/rules/local-date.js";
import type { AuthUser } from "../users/users.service.js";
import { SocialService } from "./social.service.js";

export const RANKING_SCOPES = ["weekly", "global", "friends", "country"] as const;
export type RankingScope = (typeof RANKING_SCOPES)[number];
const TOP = 50;

/**
 * Rankings (docs/REGRAS_DE_NEGOCIO.md §9), calculados no servidor a partir do livro-razão:
 * semanal = XP desde segunda 00:00 UTC; global = XP total; amigos e país = semanal entre
 * esses utilizadores. Contas eliminadas, suspensas ou banidas não entram.
 */
@Injectable()
export class RankingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly social: SocialService,
  ) {}

  async ranking(user: AuthUser, scope: RankingScope, now = new Date()) {
    const weekStart = isoWeekStartUtc(now);

    // Universo de utilizadores do ranking.
    let audience: string[] | null = null; // null = toda a gente
    if (scope === "friends") {
      audience = [user.id, ...(await this.social.friendIds(user.id))];
    } else if (scope === "country") {
      const me = await this.prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { countryCode: true },
      });
      if (!me.countryCode) {
        throw new UnprocessableEntityException({
          code: "NO_COUNTRY",
          message: "Escolhe o teu país no perfil para veres o ranking do país.",
        });
      }
      audience = (
        await this.prisma.user.findMany({
          where: { countryCode: me.countryCode, status: "ACTIVE" },
          select: { id: true },
        })
      ).map((u) => u.id);
    }

    // XP de cada utilizador no período.
    let totals: { userId: string; xp: number }[];
    if (scope === "global") {
      const rows = await this.prisma.userStats.findMany({
        where: { xpTotal: { gt: 0 }, user: { status: "ACTIVE" } },
        select: { userId: true, xpTotal: true },
      });
      totals = rows.map((r) => ({ userId: r.userId, xp: r.xpTotal }));
    } else {
      const rows = await this.prisma.xpEvent.groupBy({
        by: ["userId"],
        where: {
          createdAt: { gte: weekStart },
          ...(audience ? { userId: { in: audience } } : {}),
          user: { status: "ACTIVE" },
        },
        _sum: { amount: true },
      });
      totals = rows.map((r) => ({ userId: r.userId, xp: r._sum.amount ?? 0 }));
    }
    // No ranking de amigos aparecem todos (e eu), mesmo sem XP esta semana.
    if (scope === "friends" && audience) {
      const active = await this.prisma.user.findMany({
        where: { id: { in: audience }, status: "ACTIVE" },
        select: { id: true },
      });
      for (const { id } of active) {
        if (!totals.some((t) => t.userId === id)) totals.push({ userId: id, xp: 0 });
      }
    }

    // Ordem: mais XP; empate → ordem estável por id (posições iguais para XP igual).
    totals.sort((a, b) => b.xp - a.xp || a.userId.localeCompare(b.userId));
    const positions = new Map<string, number>();
    totals.forEach((t, i) => {
      const prev = totals[i - 1];
      positions.set(t.userId, prev && prev.xp === t.xp ? positions.get(prev.userId)! : i + 1);
    });

    const shown = totals.slice(0, TOP).map((t) => t.userId);
    if (!shown.includes(user.id) && positions.has(user.id)) shown.push(user.id);
    const users = await this.prisma.user.findMany({
      where: { id: { in: shown } },
      select: {
        id: true,
        username: true,
        name: true,
        avatarColor: true,
        stats: { select: { xpTotal: true } },
      },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    const xpOf = new Map(totals.map((t) => [t.userId, t.xp]));
    const entry = (id: string) => {
      const u = byId.get(id)!;
      return {
        position: positions.get(id)!,
        userId: id,
        username: u.username,
        name: u.name,
        avatarColor: u.avatarColor,
        xp: xpOf.get(id) ?? 0,
        level: levelForXp(u.stats?.xpTotal ?? 0).level,
        isMe: id === user.id,
      };
    };
    const top = totals
      .slice(0, TOP)
      .filter((t) => byId.has(t.userId))
      .map((t) => entry(t.userId));
    return {
      scope,
      weekStart: scope === "global" ? null : weekStart.toISOString(),
      participants: totals.length,
      top,
      me: byId.has(user.id) ? entry(user.id) : null,
    };
  }
}
