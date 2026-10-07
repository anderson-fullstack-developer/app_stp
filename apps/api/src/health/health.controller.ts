import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ENV, type Env } from "../config/env.js";

export interface HealthResponse {
  status: "ok";
  version: string;
  environment: Env["NODE_ENV"];
  uptimeSeconds: number;
  timestamp: string;
}

/** Usado por monitorização (Railway, UptimeRobot) para saber se a API está viva. */
@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(@Inject(ENV) private readonly env: Env) {}

  @Get()
  @ApiOkResponse({ description: "A API está a funcionar." })
  check(): HealthResponse {
    return {
      status: "ok",
      version: this.env.APP_VERSION ?? "dev",
      environment: this.env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
