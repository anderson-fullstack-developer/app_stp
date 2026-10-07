import { type DynamicModule, Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import { ClerkService } from "./auth/clerk.service.js";
import { AllExceptionsFilter } from "./common/all-exceptions.filter.js";
import { ENV, type Env } from "./config/env.js";
import { DatabaseModule } from "./database/database.module.js";
import { HealthController } from "./health/health.controller.js";
import { LanguagesController } from "./languages/languages.controller.js";
import { LanguagesService } from "./languages/languages.service.js";
import { MeController } from "./users/me.controller.js";
import { UsersService } from "./users/users.service.js";
import { ClerkWebhookController } from "./webhooks/clerk-webhook.controller.js";

/**
 * Módulo raiz. Recebe a configuração já validada (main.ts ou testes), para que cada
 * teste possa arrancar a API com a sua própria configuração.
 */
@Module({})
export class AppModule {
  static register(env: Env): DynamicModule {
    return {
      module: AppModule,
      global: true,
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            level: env.NODE_ENV === "test" ? "silent" : env.LOG_LEVEL,
            // Nunca registar segredos nem dados de autenticação.
            redact: ["req.headers.authorization", "req.headers.cookie"],
            transport:
              env.NODE_ENV === "development"
                ? { target: "pino-pretty", options: { singleLine: true } }
                : undefined,
          },
        }),
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: env.RATE_LIMIT_PER_MINUTE }]),
        DatabaseModule,
      ],
      controllers: [HealthController, LanguagesController, MeController, ClerkWebhookController],
      providers: [
        { provide: ENV, useValue: env },
        LanguagesService,
        UsersService,
        ClerkService,
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
      exports: [ENV],
    };
  }
}
