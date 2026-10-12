import { Injectable } from "@nestjs/common";
import { ArenaService } from "../arena/arena.service.js";
import { PrismaService } from "../database/prisma.service.js";
import type { AuthUser } from "../users/users.service.js";

const WINDOW_DAYS = 14;
const LIMIT = 30;

const WHO = { id: true, username: true, name: true, avatarColor: true } as const;

/**
 * Notificações da app, calculadas a partir do que já existe (sem tabela própria):
 * pedidos de amizade recebidos, pedidos meus aceites e conquistas dos últimos 14 dias.
 * O lembrete da sequência vem de GET /me (progress.streak.activeToday).
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly arena: ArenaService,
  ) {}

  async list(user: AuthUser, now = new Date()) {
    const since = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const [requests, accepted, achievements] = await Promise.all([
      this.prisma.friendship.findMany({
        where: { addresseeId: user.id, status: "PENDING", requester: { status: "ACTIVE" } },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        select: { id: true, createdAt: true, requester: { select: WHO } },
      }),
      this.prisma.friendship.findMany({
        where: {
          requesterId: user.id,
          status: "ACCEPTED",
          acceptedAt: { gte: since },
          addressee: { status: "ACTIVE" },
        },
        orderBy: { acceptedAt: "desc" },
        take: LIMIT,
        select: { id: true, acceptedAt: true, addressee: { select: WHO } },
      }),
      this.prisma.userAchievement.findMany({
        where: { userId: user.id, earnedAt: { gte: since } },
        orderBy: { earnedAt: "desc" },
        take: LIMIT,
      }),
    ]);
    const invites = this.arena.invitesFor(user.id);
    const items = [
      ...invites.map((i) => ({
        id: `arena_invite:${i.code}:${i.from.userId}`,
        type: "arena_invite" as const,
        at: new Date(i.at).toISOString(),
        code: i.code,
        mode: i.mode,
        expiresAt: new Date(i.expiresAt).toISOString(),
        user: {
          id: i.from.userId,
          username: i.from.username,
          name: i.from.name,
          avatarColor: i.from.avatarColor,
        },
      })),
      ...requests.map((r) => ({
        id: `friend_request:${r.id}`,
        type: "friend_request" as const,
        at: r.createdAt.toISOString(),
        requestId: r.id,
        user: r.requester,
      })),
      ...accepted.map((a) => ({
        id: `friend_accepted:${a.id}`,
        type: "friend_accepted" as const,
        at: (a.acceptedAt ?? now).toISOString(),
        user: a.addressee,
      })),
      ...achievements.map((a) => ({
        id: `achievement:${a.achievementKey}`,
        type: "achievement" as const,
        at: a.earnedAt.toISOString(),
        achievementKey: a.achievementKey,
      })),
    ];
    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, LIMIT);
  }
}
