import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role } from "../generated/prisma/client.js";
import type { AuthUser } from "../users/users.service.js";

/** Papéis exigidos por uma rota (basta um). SUPER_ADMIN passa sempre. */
export const Roles = Reflector.createDecorator<Role[]>();

/** O utilizador autenticado (definido pelo ClerkAuthGuard). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<{ user: AuthUser }>().user,
);
