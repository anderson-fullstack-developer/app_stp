import "./instrument.js";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module.js";
import { configureApp } from "./configure-app.js";
import { InvalidEnvError, loadEnv } from "./config/env.js";

async function bootstrap() {
  let env;
  try {
    env = loadEnv(process.env);
  } catch (e) {
    if (e instanceof InvalidEnvError) {
      console.error(e.message);
      process.exit(1);
    }
    throw e;
  }

  const app = await NestFactory.create(AppModule.register(env), { bufferLogs: true });
  app.useLogger(app.get(Logger));
  configureApp(app, env);
  await app.listen(env.PORT);
  app.get(Logger).log(`API a ouvir em http://localhost:${env.PORT}/api/v1 (${env.NODE_ENV})`);
}

await bootstrap();
