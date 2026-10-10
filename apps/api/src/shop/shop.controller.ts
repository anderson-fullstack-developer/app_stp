import { Body, Controller, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { z } from "zod";
import { CurrentUser } from "../auth/auth.decorators.js";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard.js";
import { ZodPipe } from "../common/zod.pipe.js";
import type { AuthUser } from "../users/users.service.js";
import { ShopService } from "./shop.service.js";

const BuyBody = z.object({ requestId: z.uuid() });

@ApiTags("shop")
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller("shop")
export class ShopController {
  constructor(private readonly shop: ShopService) {}

  @Get()
  @ApiOkResponse({ description: "Saldo e artigos (proteção de streak: preço, guardadas, máx.)." })
  overview(@CurrentUser() user: AuthUser) {
    return this.shop.overview(user);
  }

  @Post("streak-freeze")
  @HttpCode(200)
  @ApiOkResponse({ description: "Comprar uma proteção de streak (idempotente por requestId)." })
  buyFreeze(
    @Body(new ZodPipe(BuyBody)) body: z.infer<typeof BuyBody>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.shop.buyStreakFreeze(user, body.requestId);
  }
}
