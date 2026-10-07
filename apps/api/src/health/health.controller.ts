import { Controller, Get, HttpCode, HttpStatus, Inject, Res } from "@nestjs/common";
import type { Response } from "express";
import { PrismaService } from "../database/prisma.service.js";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ENV, type Env } from "../config/env.js";

export interface HealthResponse {
  status: "ok" | "degraded";
  database: "ok" | "down" | "not_configured";
  version: string;
  environment: Env["NODE_ENV"];
  uptimeSeconds: number;
  timestamp: string;
}

/** Usado por monitorização (Railway, UptimeRobot) para saber se a API está viva. */
@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: "A API está a funcionar (503 se a base de dados falhar)." })
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthResponse> {
    const database = await this.prisma.ping();
    if (database === "down") res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return {
      status: database === "down" ? "degraded" : "ok",
      database,
      version: this.env.APP_VERSION ?? "dev",
      environment: this.env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
