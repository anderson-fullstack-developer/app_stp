import { type DynamicModule, Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import { AllExceptionsFilter } from "./common/all-exceptions.filter.js";
import { ENV, type Env } from "./config/env.js";
import { HealthController } from "./health/health.controller.js";

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
      ],
      controllers: [HealthController],
      providers: [
        { provide: ENV, useValue: env },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
      exports: [ENV],
    };
  }
}
