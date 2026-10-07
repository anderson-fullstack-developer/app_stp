import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { type AuthUser, UsersService } from "../users/users.service.js";
import { Roles } from "./auth.decorators.js";
import { ClerkService } from "./clerk.service.js";

/**
 * Exige uma sessão válida do Clerk (Authorization: Bearer <token>) e carrega o utilizador
 * da nossa base de dados. Se o webhook ainda não chegou, sincroniza-o na hora.
 * Com @Roles(...) também verifica o papel.
 */
@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  constructor(
    private readonly clerk: ClerkService,
    private readonly users: UsersService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) throw new UnauthorizedException("Sessão em falta.");
    if (!this.clerk.configured) {
      throw new ServiceUnavailableException({
        code: "AUTH_NOT_CONFIGURED",
        message: "Autenticação indisponível.",
      });
    }

    const clerkId = await this.clerk.verifySession(token);
    if (!clerkId) throw new UnauthorizedException("Sessão inválida ou expirada.");

    let user = await this.users.findAuthUser(clerkId);
    if (!user) {
      this.logger.log({ clerkId }, "Utilizador ainda não sincronizado; a ler do Clerk");
      await this.users.upsertFromClerk(await this.clerk.getUser(clerkId));
      user = await this.users.findAuthUser(clerkId);
    }
    if (!user?.clerkId) throw new UnauthorizedException("Conta não encontrada.");
    if (user.status !== "ACTIVE") {
      throw new ForbiddenException({ code: "ACCOUNT_INACTIVE", message: "Conta inativa." });
    }

    const required = this.reflector.getAllAndOverride(Roles, [ctx.getHandler(), ctx.getClass()]);
    if (required?.length) {
      const allowed = user.roles.some((r) => r.role === "SUPER_ADMIN" || required.includes(r.role));
      if (!allowed) throw new ForbiddenException("Sem permissão para esta ação.");
    }

    req.user = { id: user.id, clerkId: user.clerkId, roles: user.roles };
    return true;
  }
}
