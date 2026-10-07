import { type INestApplication, VersioningType } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import type { Env } from "./config/env.js";

/**
 * Configuração HTTP partilhada por main.ts e pelos testes e2e (os testes exercitam
 * exatamente a mesma configuração que a produção).
 */
export function configureApp(app: INestApplication, env: Env): void {
  app.use(helmet());
  app.enableCors({
    origin: env.CORS_ORIGINS,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
  // Todas as rotas em /api/v1/...
  app.setGlobalPrefix("api");
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
  app.enableShutdownHooks();

  // Documentação interativa da API — nunca exposta em produção.
  if (env.NODE_ENV !== "production") {
    const config = new DocumentBuilder()
      .setTitle("Fala Neto — API")
      .setDescription("API REST da plataforma (servidor autoritativo).")
      .setVersion(env.APP_VERSION ?? "dev")
      .addBearerAuth()
      .build();
    SwaggerModule.setup("api/docs", app, () => SwaggerModule.createDocument(app, config));
  }
}
