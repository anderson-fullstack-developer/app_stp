import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { z } from "zod";
import { CurrentUser } from "../auth/auth.decorators.js";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard.js";
import { ZodPipe } from "../common/zod.pipe.js";
import type { AuthUser } from "../users/users.service.js";
import { LessonsService } from "./lessons.service.js";

const Id = z.uuid();
const StartBody = z.object({ locale: z.enum(["pt", "en", "fr"]).optional() }).default({});
const AnswerBody = z.object({ exerciseId: z.uuid(), optionId: z.uuid() });
const ProgressQuery = z.object({ languageId: z.string().regex(/^[a-z][a-z0-9_-]{1,40}$/) });

/** Jogar lições contra o servidor: começar, responder pergunta a pergunta, concluir. */
@ApiTags("lessons")
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller()
export class LessonsController {
  constructor(private readonly lessons: LessonsService) {}

  @Post("lessons/:lessonId/attempts")
  @ApiOkResponse({
    description: "Começa uma tentativa: perguntas geradas pelo servidor, sem as respostas.",
  })
  start(
    @Param("lessonId", new ZodPipe(Id)) lessonId: string,
    @Body(new ZodPipe(StartBody)) body: z.infer<typeof StartBody>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lessons.start(user, lessonId, body.locale);
  }

  @Post("lesson-attempts/:attemptId/answers")
  @HttpCode(200)
  @ApiOkResponse({ description: "Corrige uma resposta (o servidor decide se está certa)." })
  answer(
    @Param("attemptId", new ZodPipe(Id)) attemptId: string,
    @Body(new ZodPipe(AnswerBody)) body: z.infer<typeof AnswerBody>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lessons.answer(user, attemptId, body);
  }

  @Post("lesson-attempts/:attemptId/complete")
  @HttpCode(200)
  @ApiOkResponse({ description: "Conclui a lição: XP, moedas, streak e conquistas (idempotente)." })
  complete(@Param("attemptId", new ZodPipe(Id)) attemptId: string, @CurrentUser() user: AuthUser) {
    return this.lessons.complete(user, attemptId);
  }

  @Get("me/lessons")
  @ApiOkResponse({ description: "Estado de cada lição do curso (concluída, atual, bloqueada)." })
  progress(
    @Query(new ZodPipe(ProgressQuery)) q: z.infer<typeof ProgressQuery>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lessons.progress(user, q.languageId);
  }
}
