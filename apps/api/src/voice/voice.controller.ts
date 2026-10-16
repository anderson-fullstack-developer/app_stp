import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { z } from "zod";
import { CurrentUser, Roles } from "../auth/auth.decorators.js";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard.js";
import { ZodPipe } from "../common/zod.pipe.js";
import type { AuthUser } from "../users/users.service.js";
import { VOICE_RULES } from "./voice-rules.js";
import { VoiceService } from "./voice.service.js";

const LanguageId = z.string().regex(/^[a-z][a-z0-9_-]{1,40}$/);
const Locale = z.enum(["pt", "en"]).default("pt");
const Id = z.uuid();

const ProfileBody = z.object({
  displayName: z
    .string()
    .trim()
    .max(60)
    .nullable()
    .default(null)
    .transform((v) => v || null),
  region: z
    .string()
    .trim()
    .max(60)
    .nullable()
    .default(null)
    .transform((v) => v || null),
  adultConfirmed: z.boolean(),
  consentAccepted: z.boolean(),
});
const MeQuery = z.object({ todayFrom: z.iso.datetime({ offset: true }).optional() });
const MineQuery = z.object({
  locale: Locale,
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});
const WordsQuery = z.object({ languageId: LanguageId, locale: Locale });
const RecordBody = z.object({
  vocabularyId: Id,
  mimeType: z.string().max(60),
  durationMs: z.number().int().min(0).max(60_000),
  // base64 (o limite em bytes é verificado no serviço, depois de descodificar).
  data: z
    .string()
    .max(Math.ceil((VOICE_RULES.recording.maxBytes * 4) / 3) + 8)
    .regex(/^[A-Za-z0-9+/=]+$/),
});
const ReviewBody = z.object({
  verdict: z.enum(["APPROVE", "REJECT"]),
  reason: z
    .enum(["PRONUNCIATION", "NOISE", "WRONG_WORD", "CUT_OFF", "OTHER"])
    .nullable()
    .default(null),
});
const ReportQuery = z.object({ from: z.iso.date(), to: z.iso.date() });
const OverviewQuery = z.object({ languageId: LanguageId });

/**
 * Área dos Faladores e dos Ouvintes (gravações de pronúncia). O acesso fino (papel por
 * língua, consentimento, nunca avaliar a própria gravação) está no serviço.
 */
@ApiTags("voice")
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller()
export class VoiceController {
  constructor(private readonly voice: VoiceService) {}

  @Get("voice/me")
  @ApiOkResponse({ description: "Papéis, consentimento e números dos últimos 7 dias." })
  me(@CurrentUser() user: AuthUser, @Query(new ZodPipe(MeQuery)) q: z.infer<typeof MeQuery>) {
    return this.voice.me(user, q.todayFrom ? new Date(q.todayFrom) : undefined);
  }

  @Put("voice/profile")
  @ApiOkResponse({ description: "Aceitar as condições (18+), nome a mostrar e ilha/região." })
  profile(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(ProfileBody)) body: z.infer<typeof ProfileBody>,
  ) {
    return this.voice.saveProfile(user, body);
  }

  @Get("voice/words")
  @ApiOkResponse({ description: "Próximas palavras para gravar." })
  words(
    @CurrentUser() user: AuthUser,
    @Query(new ZodPipe(WordsQuery)) q: z.infer<typeof WordsQuery>,
  ) {
    return this.voice.wordsToRecord(user, q.languageId, q.locale);
  }

  @Post("voice/recordings")
  @ApiOkResponse({ description: "Enviar uma gravação (fica pendente até os ouvintes decidirem)." })
  record(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(RecordBody)) body: z.infer<typeof RecordBody>,
  ) {
    return this.voice.record(user, body);
  }

  @Get("voice/recordings/mine")
  @ApiOkResponse({ description: "As minhas gravações (estado e motivos das rejeições)." })
  mine(@CurrentUser() user: AuthUser, @Query(new ZodPipe(MineQuery)) q: z.infer<typeof MineQuery>) {
    return this.voice.myRecordings(user, q.locale, q.status);
  }

  @Get("voice/review/next")
  @ApiOkResponse({ description: "Próxima gravação para ouvir (null = não há mais)." })
  async next(
    @CurrentUser() user: AuthUser,
    @Query(new ZodPipe(WordsQuery)) q: z.infer<typeof WordsQuery>,
  ) {
    return { item: await this.voice.nextReview(user, q.languageId, q.locale) };
  }

  @Get("voice/recordings/:id/audio")
  async audio(
    @CurrentUser() user: AuthUser,
    @Param("id", new ZodPipe(Id)) id: string,
    @Res() res: Response,
  ) {
    const { data, mime } = await this.voice.audio(user, id);
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "private, no-store");
    res.send(data);
  }

  @Post("voice/recordings/:id/review")
  @HttpCode(200)
  @ApiOkResponse({ description: "Aprovar ou rejeitar (com motivo)." })
  review(
    @CurrentUser() user: AuthUser,
    @Param("id", new ZodPipe(Id)) id: string,
    @Body(new ZodPipe(ReviewBody)) body: z.infer<typeof ReviewBody>,
  ) {
    return this.voice.review(user, id, body);
  }

  @Get("admin/voice/overview")
  @Roles(["ADMIN"])
  overview(@Query(new ZodPipe(OverviewQuery)) q: z.infer<typeof OverviewQuery>) {
    return this.voice.overview(q.languageId);
  }

  @Get("admin/voice/report")
  @Roles(["ADMIN"])
  @ApiOkResponse({ description: "Contas por pessoa no período [from, to)." })
  report(@Query(new ZodPipe(ReportQuery)) q: z.infer<typeof ReportQuery>) {
    return this.voice.report(new Date(`${q.from}T00:00:00Z`), new Date(`${q.to}T00:00:00Z`));
  }
}
