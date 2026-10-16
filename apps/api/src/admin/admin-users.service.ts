import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import type { Role } from "../generated/prisma/enums.js";
import { levelForXp } from "../progress/rules/levels.js";
import type { AuthUser } from "../users/users.service.js";

/** Papéis que se atribuem no painel (USER é o de toda a gente). */
export const GRANTABLE_ROLES = [
  "MODERATOR",
  "CONTENT_EDITOR",
  "LINGUIST",
  "ADMIN",
  "SUPER_ADMIN",
  "VOICE_SPEAKER",
  "VOICE_LISTENER",
] as const;
export type GrantableRole = (typeof GRANTABLE_ROLES)[number];

/** Papéis que podem ficar presos a uma língua. */
const PER_LANGUAGE: Role[] = ["CONTENT_EDITOR", "LINGUIST", "VOICE_SPEAKER", "VOICE_LISTENER"];
const ADMIN_ROLES: Role[] = ["ADMIN", "SUPER_ADMIN"];

const isSuper = (a: AuthUser) => a.roles.some((r) => r.role === "SUPER_ADMIN");

/**
 * Utilizadores no painel: pesquisar, dar/tirar papéis e suspender.
 * - só ADMIN dá papéis; ADMIN e SUPER_ADMIN só os dá um SUPER_ADMIN;
 * - ninguém tira os próprios papéis de administração (para não ficar sem acesso);
 * - tudo fica no registo de auditoria.
 */
@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: string | undefined) {
    const query = q?.trim().replace(/^@/, "");
    const rows = await this.prisma.user.findMany({
      where: {
        status: { not: "DELETED" },
        ...(query
          ? {
              OR: [
                { username: { contains: query, mode: "insensitive" } },
                { name: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        status: true,
        countryCode: true,
        createdAt: true,
        roles: { select: { id: true, role: true, languageId: true } },
        stats: { select: { xpTotal: true, currentStreak: true } },
      },
    });
    return rows.map(({ stats, ...u }) => ({
      ...u,
      roles: u.roles.filter((r) => r.role !== "USER"),
      xpTotal: stats?.xpTotal ?? 0,
      level: levelForXp(stats?.xpTotal ?? 0).level,
      streak: stats?.currentStreak ?? 0,
    }));
  }

  async grant(actor: AuthUser, userId: string, role: GrantableRole, languageId: string | null) {
    if (ADMIN_ROLES.includes(role) && !isSuper(actor)) {
      throw new ForbiddenException({
        code: "SUPER_ADMIN_ONLY",
        message: "Só um super administrador dá papéis de administração.",
      });
    }
    if (languageId && !PER_LANGUAGE.includes(role)) {
      throw new BadRequestException({
        code: "ROLE_NOT_PER_LANGUAGE",
        message: "Este papel não é por língua.",
      });
    }
    if (languageId && !(await this.prisma.language.findUnique({ where: { id: languageId } }))) {
      throw new UnprocessableEntityException({
        code: "UNKNOWN_LANGUAGE",
        message: "Língua desconhecida.",
      });
    }
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });
    if (!target || target.status === "DELETED") {
      throw new NotFoundException("Utilizador não encontrado.");
    }
    // O índice único não trata NULL como igual: procurar antes de criar.
    const existing = await this.prisma.userRole.findFirst({
      where: { userId, role, languageId },
    });
    if (existing) return { id: existing.id, role, languageId };
    const created = await this.prisma.userRole.create({
      data: { userId, role, languageId, grantedById: actor.id },
    });
    await this.audit(actor, "user.role_grant", userId, { role, languageId });
    return { id: created.id, role, languageId };
  }

  async revoke(actor: AuthUser, roleId: string) {
    const row = await this.prisma.userRole.findUnique({ where: { id: roleId } });
    if (!row || row.role === "USER") throw new NotFoundException("Papel não encontrado.");
    if (ADMIN_ROLES.includes(row.role) && !isSuper(actor)) {
      throw new ForbiddenException({
        code: "SUPER_ADMIN_ONLY",
        message: "Só um super administrador tira papéis de administração.",
      });
    }
    if (row.userId === actor.id && ADMIN_ROLES.includes(row.role)) {
      throw new ForbiddenException({
        code: "SELF_LOCKOUT",
        message: "Não podes tirar o teu próprio papel de administração.",
      });
    }
    await this.prisma.userRole.delete({ where: { id: roleId } });
    await this.audit(actor, "user.role_revoke", row.userId, {
      role: row.role,
      languageId: row.languageId,
    });
    return { revoked: true };
  }

  /** Suspender ou reativar uma conta (moderação). */
  async setStatus(actor: AuthUser, userId: string, status: "ACTIVE" | "SUSPENDED") {
    if (userId === actor.id) {
      throw new ForbiddenException({ code: "SELF_MODERATION", message: "Não te podes suspender." });
    }
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true, roles: { select: { role: true } } },
    });
    if (!target || target.status === "DELETED") {
      throw new NotFoundException("Utilizador não encontrado.");
    }
    if (target.roles.some((r) => ADMIN_ROLES.includes(r.role)) && !isSuper(actor)) {
      throw new ForbiddenException({
        code: "SUPER_ADMIN_ONLY",
        message: "Só um super administrador suspende administradores.",
      });
    }
    await this.prisma.user.update({ where: { id: userId }, data: { status } });
    await this.audit(actor, status === "SUSPENDED" ? "user.suspend" : "user.reactivate", userId, {
      from: target.status,
    });
    return { status };
  }

  private audit(
    actor: AuthUser,
    action: string,
    userId: string,
    metadata: Record<string, string | null>,
  ) {
    return this.prisma.adminAuditLog.create({
      data: { actorId: actor.id, action, entityType: "USER", entityId: userId, metadata },
    });
  }
}
