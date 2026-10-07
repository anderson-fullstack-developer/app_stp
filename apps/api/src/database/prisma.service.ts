import { Inject, Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { ENV, type Env } from "../config/env.js";
import { PrismaClient } from "../generated/prisma/client.js";

/**
 * Cliente Prisma partilhado (Prisma 7 com adaptador pg). Usa a ligação com pooling da Neon.
 * Sem DATABASE_URL (só permitido em testes) o serviço fica "não configurado".
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  readonly configured: boolean;

  constructor(@Inject(ENV) env: Env) {
    super({
      adapter: new PrismaPg({ connectionString: env.DATABASE_URL ?? "postgresql://invalid" }),
    });
    this.configured = Boolean(env.DATABASE_URL);
  }

  /** Verifica a ligação (SELECT 1). Nunca lança: devolve o estado. */
  async ping(): Promise<"ok" | "down" | "not_configured"> {
    if (!this.configured) return "not_configured";
    try {
      await this.$queryRaw`SELECT 1`;
      return "ok";
    } catch (e) {
      this.logger.error({ err: e }, "Base de dados indisponível");
      return "down";
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
