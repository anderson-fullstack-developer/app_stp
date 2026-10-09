import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { levelForXp } from "../progress/rules/levels.js";
import { isoWeekStartUtc } from "../progress/rules/local-date.js";
import type { AuthUser } from "../users/users.service.js";

export type Relationship = "none" | "friends" | "pending_out" | "pending_in";

const PUBLIC_USER = {
  id: true,
  username: true,
  name: true,
  avatarColor: true,
  countryCode: true,
  stats: { select: { xpTotal: true, currentStreak: true } },
} as const;

type PublicUserRow = {
  id: string;
  username: string;
  name: string;
  avatarColor: string | null;
  countryCode: string | null;
  stats: { xpTotal: number; currentStreak: number } | null;
};

/**
 * Amigos (passo B8): pesquisar, pedidos, aceitar/recusar, remover e bloquear.
 * Quem está bloqueado (em qualquer direção) não aparece nem consegue pedir amizade.
 */
@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  private publicUser(u: PublicUserRow, weeklyXp?: number) {
    const xp = u.stats?.xpTotal ?? 0;
    return {
      id: u.id,
      username: u.username,
      name: u.name,
      avatarColor: u.avatarColor,
      countryCode: u.countryCode,
      level: levelForXp(xp).level,
      streak: u.stats?.currentStreak ?? 0,
      ...(weeklyXp !== undefined ? { weeklyXp } : {}),
    };
  }

  /** Ids que o utilizador não pode ver: bloqueou-os ou foi bloqueado por eles. */
  private async blockedIds(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.userBlock.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    return new Set(rows.map((r) => (r.blockerId === userId ? r.blockedId : r.blockerId)));
  }

  private async friendshipBetween(a: string, b: string) {
    return this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: a, addresseeId: b },
          { requesterId: b, addresseeId: a },
        ],
      },
    });
  }

  private relationshipOf(
    meId: string,
    f: { requesterId: string; status: string } | null,
  ): Relationship {
    if (!f) return "none";
    if (f.status === "ACCEPTED") return "friends";
    return f.requesterId === meId ? "pending_out" : "pending_in";
  }

  /** XP desta semana (segunda 00:00 UTC) por utilizador. */
  async weeklyXp(userIds: string[], now = new Date()): Promise<Map<string, number>> {
    if (!userIds.length) return new Map();
    const rows = await this.prisma.xpEvent.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, createdAt: { gte: isoWeekStartUtc(now) } },
      _sum: { amount: true },
    });
    return new Map(rows.map((r) => [r.userId, r._sum.amount ?? 0]));
  }

  async search(user: AuthUser, query: string) {
    const q = query.trim().replace(/^@/, "");
    if (q.length < 2) return [];
    const hidden = await this.blockedIds(user.id);
    const rows = await this.prisma.user.findMany({
      where: {
        status: "ACTIVE",
        clerkId: { not: null },
        id: { notIn: [user.id, ...hidden] },
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { username: "asc" },
      take: 20,
      select: PUBLIC_USER,
    });
    const links = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: user.id, addresseeId: { in: rows.map((r) => r.id) } },
          { addresseeId: user.id, requesterId: { in: rows.map((r) => r.id) } },
        ],
      },
    });
    return rows.map((r) => ({
      ...this.publicUser(r),
      relationship: this.relationshipOf(
        user.id,
        links.find((l) => l.requesterId === r.id || l.addresseeId === r.id) ?? null,
      ),
    }));
  }

  /** Amigos (com XP da semana), pedidos recebidos e enviados. */
  async list(user: AuthUser) {
    const rows = await this.prisma.friendship.findMany({
      where: { OR: [{ requesterId: user.id }, { addresseeId: user.id }] },
      orderBy: { createdAt: "desc" },
      include: { requester: { select: PUBLIC_USER }, addressee: { select: PUBLIC_USER } },
    });
    const other = (f: (typeof rows)[number]) =>
      f.requesterId === user.id ? f.addressee : f.requester;
    const friendsRows = rows.filter((f) => f.status === "ACCEPTED");
    const weekly = await this.weeklyXp(friendsRows.map((f) => other(f).id));
    return {
      friends: friendsRows
        .map((f) => ({
          ...this.publicUser(other(f), weekly.get(other(f).id) ?? 0),
          since: f.acceptedAt,
        }))
        .sort((a, b) => (b.weeklyXp ?? 0) - (a.weeklyXp ?? 0)),
      incoming: rows
        .filter((f) => f.status === "PENDING" && f.addresseeId === user.id)
        .map((f) => ({ requestId: f.id, user: this.publicUser(f.requester), sentAt: f.createdAt })),
      outgoing: rows
        .filter((f) => f.status === "PENDING" && f.requesterId === user.id)
        .map((f) => ({ requestId: f.id, user: this.publicUser(f.addressee), sentAt: f.createdAt })),
    };
  }

  async sendRequest(user: AuthUser, targetId: string) {
    if (targetId === user.id) {
      throw new BadRequestException({
        code: "SELF_REQUEST",
        message: "Não podes adicionar-te a ti próprio.",
      });
    }
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, status: true },
    });
    const hidden = await this.blockedIds(user.id);
    // Bloqueado ou inexistente: a mesma resposta (não revela bloqueios).
    if (!target || target.status !== "ACTIVE" || hidden.has(targetId)) {
      throw new NotFoundException("Utilizador não encontrado.");
    }
    const existing = await this.friendshipBetween(user.id, targetId);
    if (existing?.status === "ACCEPTED") {
      throw new ConflictException({ code: "ALREADY_FRIENDS", message: "Já são amigos." });
    }
    if (existing && existing.requesterId === user.id) {
      return { status: "pending_out" as const, requestId: existing.id }; // idempotente
    }
    if (existing) {
      // A outra pessoa já tinha pedido: aceitar.
      await this.prisma.friendship.update({
        where: { id: existing.id },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      });
      return { status: "friends" as const, requestId: existing.id };
    }
    try {
      const created = await this.prisma.friendship.create({
        data: { requesterId: user.id, addresseeId: targetId },
      });
      return { status: "pending_out" as const, requestId: created.id };
    } catch {
      // Pedido duplicado ao mesmo tempo (duplo toque).
      const again = await this.friendshipBetween(user.id, targetId);
      return { status: this.relationshipOf(user.id, again), requestId: again?.id ?? null };
    }
  }

  async accept(user: AuthUser, requestId: string) {
    const f = await this.prisma.friendship.findUnique({ where: { id: requestId } });
    if (!f || f.addresseeId !== user.id) throw new NotFoundException("Pedido não encontrado.");
    if (f.status === "ACCEPTED") return { status: "friends" as const };
    await this.prisma.friendship.update({
      where: { id: f.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    return { status: "friends" as const };
  }

  /** Recusar (quem recebeu) ou cancelar (quem enviou) um pedido pendente. */
  async decline(user: AuthUser, requestId: string) {
    const f = await this.prisma.friendship.findUnique({ where: { id: requestId } });
    if (!f || (f.addresseeId !== user.id && f.requesterId !== user.id)) {
      throw new NotFoundException("Pedido não encontrado.");
    }
    if (f.status !== "PENDING") {
      throw new ForbiddenException({ code: "NOT_PENDING", message: "Este pedido já foi aceite." });
    }
    await this.prisma.friendship.delete({ where: { id: f.id } });
    return { status: "none" as const };
  }

  async remove(user: AuthUser, otherId: string) {
    await this.prisma.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: user.id, addresseeId: otherId },
          { requesterId: otherId, addresseeId: user.id },
        ],
      },
    });
    return { status: "none" as const };
  }

  /** Bloquear também desfaz a amizade e os pedidos entre os dois. */
  async block(user: AuthUser, otherId: string) {
    if (otherId === user.id) {
      throw new BadRequestException({ code: "SELF_BLOCK", message: "Não te podes bloquear." });
    }
    const exists = await this.prisma.user.findUnique({
      where: { id: otherId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException("Utilizador não encontrado.");
    await this.prisma.$transaction([
      this.prisma.friendship.deleteMany({
        where: {
          OR: [
            { requesterId: user.id, addresseeId: otherId },
            { requesterId: otherId, addresseeId: user.id },
          ],
        },
      }),
      this.prisma.userBlock.upsert({
        where: { blockerId_blockedId: { blockerId: user.id, blockedId: otherId } },
        create: { blockerId: user.id, blockedId: otherId },
        update: {},
      }),
    ]);
    return { blocked: true };
  }

  async unblock(user: AuthUser, otherId: string) {
    await this.prisma.userBlock.deleteMany({ where: { blockerId: user.id, blockedId: otherId } });
    return { blocked: false };
  }

  /** Ids dos amigos aceites (para o ranking de amigos). */
  async friendIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.friendship.findMany({
      where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] },
      select: { requesterId: true, addresseeId: true },
    });
    return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
  }
}
