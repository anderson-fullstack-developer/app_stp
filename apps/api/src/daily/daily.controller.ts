import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { z } from "zod";
import { CurrentUser } from "../auth/auth.decorators.js";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard.js";
import { ZodPipe } from "../common/zod.pipe.js";
import type { AuthUser } from "../users/users.service.js";
import { DailyService } from "./daily.service.js";

const LanguageId = z.string().regex(/^[a-z][a-z0-9_-]{1,40}$/, "id de língua inválido");
const Id = z.uuid();
const StartBody = z.object({ locale: z.enum(["pt", "en", "fr"]).optional() }).default({});
const AnswerBody = z.object({ exerciseId: z.uuid(), optionId: z.uuid() });

/** Desafio do dia: o mesmo para todos no dia UTC, uma tentativa por pessoa, ranking diário. */
@ApiTags("daily")
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller()
export class DailyController {
  constructor(private readonly daily: DailyService) {}

  @Get("daily/:languageId")
  @ApiOkResponse({ description: "Desafio de hoje: recompensas, participantes e o meu estado." })
  overview(
    @Param("languageId", new ZodPipe(LanguageId)) languageId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.daily.overview(user, languageId);
  }

  @Get("daily/:languageId/ranking")
  @ApiOkResponse({ description: "Ranking do desafio de hoje (top 20 e a minha posição)." })
  ranking(
    @Param("languageId", new ZodPipe(LanguageId)) languageId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.daily.ranking(user, languageId);
  }

  @Post("daily/:languageId/attempts")
  @ApiOkResponse({ description: "Começa (ou retoma) a tentativa de hoje." })
  start(
    @Param("languageId", new ZodPipe(LanguageId)) languageId: string,
    @Body(new ZodPipe(StartBody)) body: z.infer<typeof StartBody>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.daily.start(user, languageId, body.locale);
  }

  @Post("daily-attempts/:attemptId/answers")
  @HttpCode(200)
  @ApiOkResponse({ description: "Uma resposta por pergunta, corrigida no servidor." })
  answer(
    @Param("attemptId", new ZodPipe(Id)) attemptId: string,
    @Body(new ZodPipe(AnswerBody)) body: z.infer<typeof AnswerBody>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.daily.answer(user, attemptId, body);
  }

  @Post("daily-attempts/:attemptId/complete")
  @HttpCode(200)
  @ApiOkResponse({
    description: "Conclui: recompensa (1×/dia local), streak e posição no ranking.",
  })
  complete(@Param("attemptId", new ZodPipe(Id)) attemptId: string, @CurrentUser() user: AuthUser) {
    return this.daily.complete(user, attemptId);
  }
}
