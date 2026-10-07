import "dotenv/config";
/**
 * Sentry (erros). Tem de ser importado antes de tudo o resto em main.ts.
 * Só ativa se SENTRY_DSN estiver definido — em desenvolvimento normalmente não está.
 */
import * as Sentry from "@sentry/nestjs";

const dsn = process.env["SENTRY_DSN"];
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env["NODE_ENV"] ?? "development",
    release: process.env["APP_VERSION"],
    tracesSampleRate: 0.1,
  });
}
