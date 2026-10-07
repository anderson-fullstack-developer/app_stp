import { z } from "zod";

/**
 * Configuração da API, validada no arranque. Se algo estiver errado o processo termina
 * com uma mensagem clara — nunca arranca com configuração inválida.
 * Segredos nunca têm valor por omissão.
 */
const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    /** Origens autorizadas a chamar a API (admin web, app em desenvolvimento), separadas por vírgula. */
    CORS_ORIGINS: z
      .string()
      .default("http://localhost:8080")
      .transform((s) =>
        s
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean),
      )
      .pipe(z.array(z.url())),
    /** Pedidos por minuto por cliente antes de responder 429. */
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(120),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    SENTRY_DSN: z.preprocess(emptyToUndefined, z.url().optional()),
    APP_VERSION: z.preprocess(emptyToUndefined, z.string().optional()),
    /** Neon com pooling (runtime). Obrigatória em staging e produção. */
    DATABASE_URL: z.preprocess(emptyToUndefined, z.string().startsWith("postgres").optional()),
  })
  .superRefine((env, ctx) => {
    if ((env.NODE_ENV === "staging" || env.NODE_ENV === "production") && !env.DATABASE_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "obrigatória em staging/produção",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Token de injeção da configuração validada. */
export const ENV = Symbol("ENV");

export class InvalidEnvError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Configuração inválida da API:\n${issues.map((i) => `  - ${i}`).join("\n")}`);
    this.name = "InvalidEnvError";
  }
}

export function loadEnv(source: Record<string, string | undefined>): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new InvalidEnvError(
      parsed.error.issues.map((i) => `${i.path.join(".") || "(raiz)"}: ${i.message}`),
    );
  }
  return parsed.data;
}
