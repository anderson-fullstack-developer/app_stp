import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { z } from "zod";
import { CurrentUser, Roles } from "../auth/auth.decorators.js";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard.js";
import { ZodPipe } from "../common/zod.pipe.js";
import type { AuthUser } from "../users/users.service.js";
import { REVIEW_ACTIONS } from "./review-rules.js";
import { REVIEWABLE_KINDS, ReviewService } from "./review.service.js";

const Kind = z.enum(REVIEWABLE_KINDS);
const Action = z.enum(REVIEW_ACTIONS);
const Id = z.uuid();
const ReviewBody = z.object({ comment: z.string().trim().max(1000).optional() }).default({});
const QueueQuery = z.object({ languageId: z.string().regex(/^[a-z][a-z0-9_-]{1,40}$/) });

/**
 * Revisão de conteúdo. A permissão fina (autor não revê, linguista só da sua língua)
 * é decidida em review-rules.ts; aqui só se exige um papel de conteúdo.
 */
@ApiTags("content-review")
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Roles(["CONTENT_EDITOR", "LINGUIST", "ADMIN"])
@Controller("content")
export class ReviewController {
  constructor(private readonly review: ReviewService) {}

  @Get("review-queue")
  @ApiOkResponse({ description: "Conteúdo à espera de revisão numa língua." })
  queue(@Query(new ZodPipe(QueueQuery)) q: z.infer<typeof QueueQuery>) {
    return this.review.queue(q.languageId);
  }

  @Get(":kind/:id/reviews")
  @ApiOkResponse({ description: "Histórico de revisão de um conteúdo." })
  history(
    @Param("kind", new ZodPipe(Kind)) kind: z.infer<typeof Kind>,
    @Param("id", new ZodPipe(Id)) id: string,
  ) {
    return this.review.history(kind, id);
  }

  @Post(":kind/:id/:action")
  @HttpCode(200)
  @ApiOkResponse({
    description: "Aplica uma ação de revisão (submit, approve, request_changes, reject, archive).",
  })
  act(
    @Param("kind", new ZodPipe(Kind)) kind: z.infer<typeof Kind>,
    @Param("id", new ZodPipe(Id)) id: string,
    @Param("action", new ZodPipe(Action)) action: z.infer<typeof Action>,
    @Body(new ZodPipe(ReviewBody)) body: z.infer<typeof ReviewBody>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.review.apply(kind, id, action, user, body.comment);
  }
}
