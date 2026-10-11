import { Injectable } from "@nestjs/common";
import { ClerkService } from "../auth/clerk.service.js";
import { PrismaService } from "../database/prisma.service.js";
import { UsersService } from "../users/users.service.js";
import type { ArenaIdentity } from "./arena.service.js";

/**
 * Autentica a ligação em tempo real com o mesmo token do Clerk que a API REST usa
 * (enviado em `auth.token` no handshake). Contas inativas não entram.
 */
@Injectable()
export class ArenaAuthService {
  constructor(
    private readonly clerk: ClerkService,
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  async authenticate(token: string | undefined): Promise<ArenaIdentity | null> {
    if (!token || !this.clerk.configured) return null;
    const clerkId = await this.clerk.verifySession(token);
    if (!clerkId) return null;
    let user = await this.users.findAuthUser(clerkId);
    if (!user) {
      await this.users.upsertFromClerk(await this.clerk.getUser(clerkId));
      user = await this.users.findAuthUser(clerkId);
    }
    if (!user || user.status !== "ACTIVE") return null;
    return this.identity(user.id);
  }

  /** Dados de apresentação lidos da BD (nunca do cliente). */
  async identity(userId: string): Promise<ArenaIdentity | null> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        avatarColor: true,
        uiLocale: true,
        learningLanguageId: true,
        status: true,
      },
    });
    if (!u || u.status !== "ACTIVE") return null;
    return {
      userId: u.id,
      username: u.username,
      name: u.name,
      avatarColor: u.avatarColor,
      uiLocale: u.uiLocale,
      learningLanguageId: u.learningLanguageId,
    };
  }
}
