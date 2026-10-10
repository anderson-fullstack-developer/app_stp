import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { z } from "zod";
import { CurrentUser } from "../auth/auth.decorators.js";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard.js";
import { ZodPipe } from "../common/zod.pipe.js";
import type { AuthUser } from "../users/users.service.js";
import { NotificationsService } from "./notifications.service.js";
import { RANKING_SCOPES, RankingService } from "./ranking.service.js";
import { SocialService } from "./social.service.js";

const Id = z.uuid();
const SearchQuery = z.object({ q: z.string().trim().max(40).default("") });
const RequestBody = z.object({ userId: z.uuid() });
const RankingQuery = z.object({ scope: z.enum(RANKING_SCOPES).default("weekly") });

/** Amigos, bloqueios e rankings (passo B8). */
@ApiTags("social")
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller()
export class SocialController {
  constructor(
    private readonly social: SocialService,
    private readonly rankings: RankingService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get("me/notifications")
  @ApiOkResponse({ description: "Pedidos de amizade, pedidos aceites e conquistas recentes." })
  notificationsList(@CurrentUser() user: AuthUser) {
    return this.notifications.list(user);
  }

  @Get("users/search")
  @ApiOkResponse({ description: "Pesquisar pessoas por @username ou nome (com a relação comigo)." })
  search(
    @Query(new ZodPipe(SearchQuery)) q: z.infer<typeof SearchQuery>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.social.search(user, q.q);
  }

  @Get("users/:id")
  @ApiOkResponse({ description: "Perfil público (nível, XP, sequência, conquistas, relação)." })
  profile(@Param("id", new ZodPipe(Id)) id: string, @CurrentUser() user: AuthUser) {
    return this.social.profile(user, id);
  }

  @Get("friends")
  @ApiOkResponse({ description: "Amigos (com XP da semana), pedidos recebidos e enviados." })
  list(@CurrentUser() user: AuthUser) {
    return this.social.list(user);
  }

  @Post("friends/requests")
  @HttpCode(200)
  @ApiOkResponse({ description: "Enviar pedido de amizade (aceita sozinho se o outro já pediu)." })
  request(
    @Body(new ZodPipe(RequestBody)) body: z.infer<typeof RequestBody>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.social.sendRequest(user, body.userId);
  }

  @Post("friends/requests/:id/accept")
  @HttpCode(200)
  accept(@Param("id", new ZodPipe(Id)) id: string, @CurrentUser() user: AuthUser) {
    return this.social.accept(user, id);
  }

  @Post("friends/requests/:id/decline")
  @HttpCode(200)
  decline(@Param("id", new ZodPipe(Id)) id: string, @CurrentUser() user: AuthUser) {
    return this.social.decline(user, id);
  }

  @Delete("friends/:userId")
  remove(@Param("userId", new ZodPipe(Id)) userId: string, @CurrentUser() user: AuthUser) {
    return this.social.remove(user, userId);
  }

  @Post("blocks/:userId")
  @HttpCode(200)
  block(@Param("userId", new ZodPipe(Id)) userId: string, @CurrentUser() user: AuthUser) {
    return this.social.block(user, userId);
  }

  @Delete("blocks/:userId")
  unblock(@Param("userId", new ZodPipe(Id)) userId: string, @CurrentUser() user: AuthUser) {
    return this.social.unblock(user, userId);
  }

  @Get("rankings")
  @ApiOkResponse({ description: "Ranking semanal, global, de amigos ou do país (top 50 + eu)." })
  ranking(
    @Query(new ZodPipe(RankingQuery)) q: z.infer<typeof RankingQuery>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.rankings.ranking(user, q.scope);
  }
}
