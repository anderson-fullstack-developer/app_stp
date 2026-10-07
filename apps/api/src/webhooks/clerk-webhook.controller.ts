import {
  BadRequestException,
  Controller,
  HttpCode,
  Inject,
  Logger,
  Post,
  type RawBodyRequest,
  Req,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { type WebhookEvent, verifyWebhook } from "@clerk/backend/webhooks";
import type { Request } from "express";
import { ENV, type Env } from "../config/env.js";
import { fromWebhook } from "../users/clerk-user.mapper.js";
import { UsersService } from "../users/users.service.js";

/**
 * Eventos do Clerk (Standard Webhooks). A assinatura é verificada sobre o corpo original
 * (rawBody); sem assinatura válida nada é processado.
 */
@ApiExcludeController()
@SkipThrottle()
@Controller("webhooks")
export class ClerkWebhookController {
  private readonly logger = new Logger(ClerkWebhookController.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly users: UsersService,
  ) {}

  @Post("clerk")
  @HttpCode(200)
  async clerk(@Req() req: RawBodyRequest<Request>) {
    const secret = this.env.CLERK_WEBHOOK_SIGNING_SECRET;
    if (!secret) {
      throw new ServiceUnavailableException({
        code: "WEBHOOK_NOT_CONFIGURED",
        message: "Webhook não configurado.",
      });
    }
    const evt = await this.verify(req, secret);

    switch (evt.type) {
      case "user.created":
      case "user.updated":
        await this.users.upsertFromClerk(fromWebhook(evt.data));
        break;
      case "user.deleted":
        if (evt.data.id) await this.users.softDeleteByClerkId(evt.data.id);
        break;
      default:
        this.logger.debug({ type: evt.type }, "Evento do Clerk ignorado");
    }
    return { received: true, type: evt.type };
  }

  private async verify(req: RawBodyRequest<Request>, secret: string): Promise<WebhookEvent> {
    const invalid = new BadRequestException({
      code: "INVALID_SIGNATURE",
      message: "Assinatura do webhook inválida.",
    });
    if (!req.rawBody) throw invalid;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === "string") headers.set(key, value);
    }
    try {
      return await verifyWebhook(
        new Request("http://localhost/api/v1/webhooks/clerk", {
          method: "POST",
          headers,
          body: req.rawBody.toString("utf8"),
        }),
        { signingSecret: secret },
      );
    } catch {
      throw invalid;
    }
  }
}
