import { Inject, Injectable } from "@nestjs/common";
import { type ClerkClient, createClerkClient, verifyToken } from "@clerk/backend";
import { ENV, type Env } from "../config/env.js";
import { type ClerkUserInput, fromApi } from "../users/clerk-user.mapper.js";

/** Acesso ao Clerk isolado num serviço (fácil de substituir nos testes). */
@Injectable()
export class ClerkService {
  private readonly client: ClerkClient | null;

  constructor(@Inject(ENV) private readonly env: Env) {
    this.client = env.CLERK_SECRET_KEY
      ? createClerkClient({ secretKey: env.CLERK_SECRET_KEY })
      : null;
  }

  get configured(): boolean {
    return this.client !== null;
  }

  /** Valida o token de sessão (JWT) e devolve o id do utilizador no Clerk, ou null. */
  async verifySession(token: string): Promise<string | null> {
    if (!this.env.CLERK_SECRET_KEY) return null;
    try {
      const payload = await verifyToken(token, {
        secretKey: this.env.CLERK_SECRET_KEY,
        authorizedParties: this.env.CLERK_AUTHORIZED_PARTIES,
      });
      return payload.sub || null;
    } catch {
      return null;
    }
  }

  async getUser(clerkId: string): Promise<ClerkUserInput> {
    if (!this.client) throw new Error("Clerk não configurado");
    return fromApi(await this.client.users.getUser(clerkId));
  }
}
