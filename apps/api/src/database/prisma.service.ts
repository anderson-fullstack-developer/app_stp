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
      // As transações que pagam recompensas (lições, desafio, Arena) fazem várias leituras e
      // escritas; com a Neon longe ou "fria", os 5 s padrão não chegam e o pagamento falha.
      transactionOptions: { maxWait: 10_000, timeout: 20_000 },
    });
    this.configured = Boolean(env.DATABASE_URL);
  }

  /**
   * Verifica a ligação (SELECT 1). Nunca lança: devolve o estado. Tenta duas vezes, porque
   * a Neon "acorda" do modo de poupança e a primeira ligação pode falhar sem haver avaria.
   */
  async ping(): Promise<"ok" | "down" | "not_configured"> {
    if (!this.configured) return "not_configured";
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await this.$queryRaw`SELECT 1`;
        return "ok";
      } catch (e) {
        if (attempt === 2) {
          this.logger.error({ err: e }, "Base de dados indisponível");
          return "down";
        }
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    return "down";
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
