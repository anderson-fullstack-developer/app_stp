import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
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
import { VoiceAdminService } from "./voice-admin.service.js";
import { VOICE_RULES } from "./voice-rules.js";
import { PAYOUT_METHODS, VoiceService } from "./voice.service.js";

const LanguageId = z.string().regex(/^[a-z][a-z0-9_-]{1,40}$/);
const Locale = z.enum(["pt", "en"]).default("pt");
const Id = z.uuid();
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .default(null)
    .transform((v) => v || null);

const MeQuery = z.object({ todayFrom: z.iso.datetime({ offset: true }).optional() });
const ProfileBody = z.object({
  displayName: optionalText(60),
  region: optionalText(60),
  adultConfirmed: z.boolean(),
  consentAccepted: z.boolean(),
});
const PayoutDetailsBody = z.object({
  method: z.enum(PAYOUT_METHODS),
  details: z.string().trim().min(3).max(120),
});
const LocaleQuery = z.object({ locale: Locale });
const MineQuery = z.object({
  locale: Locale,
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});
const RecordBody = z.object({
  taskId: Id,
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
  taskId: Id,
  verdict: z.enum(["APPROVE", "REJECT"]),
  reason: z
    .enum(["PRONUNCIATION", "NOISE", "WRONG_WORD", "CUT_OFF", "OTHER"])
    .nullable()
    .default(null),
});
const TaskStatus = z.enum(["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]);
const TasksQuery = z.object({ status: TaskStatus.optional(), assigneeId: Id.optional() });
const CreateTaskBody = z.object({
  kind: z.enum(["RECORD", "REVIEW"]),
  assigneeId: Id,
  languageId: LanguageId,
  title: z.string().trim().min(3).max(120),
  notes: optionalText(1000),
  target: z.number().int().min(1).max(10_000),
  /** Cêntimos: 1 cêntimo a 100 € por unidade. */
  rateCents: z.number().int().min(1).max(10_000),
  unitId: Id.nullable().default(null),
  dueAt: z.iso.datetime({ offset: true }).nullable().default(null),
});
const UpdateTaskBody = z.object({
  status: TaskStatus.optional(),
  target: z.number().int().min(1).max(10_000).optional(),
  dueAt: z.iso.datetime({ offset: true }).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  title: z.string().trim().min(3).max(120).optional(),
});
const PauseBody = z.object({ paused: z.boolean() });
const PayoutBody = z.object({
  userId: Id,
  amountCents: z.number().int().min(1).max(10_000_000),
  method: z.enum(PAYOUT_METHODS),
  reference: optionalText(120),
  note: optionalText(500),
});
const PayoutsQuery = z.object({ userId: Id.optional() });
const ReportQuery = z.object({ from: z.iso.date(), to: z.iso.date() });
const OverviewQuery = z.object({ languageId: LanguageId });

/**
 * Área dos Faladores e dos Ouvintes (trabalho pago por tarefas) e o painel de gestão.
 * O acesso fino (tarefa minha e ativa, papel por língua, consentimento, pausa, nunca
 * avaliar a própria gravação) está nos serviços.
 */
@ApiTags("voice")
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller()
export class VoiceController {
  constructor(
    private readonly voice: VoiceService,
    private readonly admin: VoiceAdminService,
  ) {}

  /* ------------------------------ quem trabalha ------------------------------ */

  @Get("voice/me")
  @ApiOkResponse({ description: "Papéis, consentimento, dados de pagamento e progresso." })
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

  @Put("voice/payout-details")
  @ApiOkResponse({ description: "Como quero receber (SEPA, MB WAY, Stripe, outro)." })
  payoutDetails(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(PayoutDetailsBody)) body: z.infer<typeof PayoutDetailsBody>,
  ) {
    return this.voice.savePayoutDetails(user, body);
  }

  @Get("voice/tasks")
  @ApiOkResponse({ description: "As minhas tarefas, com progresso e valores." })
  tasks(@CurrentUser() user: AuthUser) {
    return this.voice.myTasks(user);
  }

  @Get("voice/earnings")
  @ApiOkResponse({ description: "Ganhos, à espera, recebido, saldo e pagamentos." })
  earnings(@CurrentUser() user: AuthUser) {
    return this.voice.earnings(user);
  }

  @Get("voice/tasks/:id/words")
  @ApiOkResponse({ description: "Próximas palavras para gravar nesta tarefa." })
  words(
    @CurrentUser() user: AuthUser,
    @Param("id", new ZodPipe(Id)) id: string,
    @Query(new ZodPipe(LocaleQuery)) q: z.infer<typeof LocaleQuery>,
  ) {
    return this.voice.wordsToRecord(user, id, q.locale);
  }

  @Get("voice/tasks/:id/review/next")
  @ApiOkResponse({ description: "Próxima gravação para ouvir nesta tarefa (null = acabou)." })
  async next(
    @CurrentUser() user: AuthUser,
    @Param("id", new ZodPipe(Id)) id: string,
    @Query(new ZodPipe(LocaleQuery)) q: z.infer<typeof LocaleQuery>,
  ) {
    return { item: await this.voice.nextReview(user, id, q.locale) };
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
  @ApiOkResponse({ description: "Aprovar ou rejeitar (com motivo), dentro de uma tarefa." })
  review(
    @CurrentUser() user: AuthUser,
    @Param("id", new ZodPipe(Id)) id: string,
    @Body(new ZodPipe(ReviewBody)) body: z.infer<typeof ReviewBody>,
  ) {
    return this.voice.review(user, id, body);
  }

  /* -------------------------------- administração -------------------------------- */

  @Get("admin/voice/overview")
  @Roles(["ADMIN"])
  overview(@Query(new ZodPipe(OverviewQuery)) q: z.infer<typeof OverviewQuery>) {
    return this.admin.overview(q.languageId);
  }

  @Get("admin/voice/tasks")
  @Roles(["ADMIN"])
  adminTasks(@Query(new ZodPipe(TasksQuery)) q: z.infer<typeof TasksQuery>) {
    return this.admin.tasks(q);
  }

  @Post("admin/voice/tasks")
  @Roles(["ADMIN"])
  @ApiOkResponse({ description: "Atribuir uma tarefa paga a uma pessoa." })
  createTask(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(CreateTaskBody)) body: z.infer<typeof CreateTaskBody>,
  ) {
    return this.admin.createTask(user, body);
  }

  @Patch("admin/voice/tasks/:id")
  @Roles(["ADMIN"])
  updateTask(
    @CurrentUser() user: AuthUser,
    @Param("id", new ZodPipe(Id)) id: string,
    @Body(new ZodPipe(UpdateTaskBody)) body: z.infer<typeof UpdateTaskBody>,
  ) {
    return this.admin.updateTask(user, id, body);
  }

  @Get("admin/voice/people")
  @Roles(["ADMIN"])
  @ApiOkResponse({ description: "Faladores e ouvintes: qualidade, saldo e dados de pagamento." })
  people() {
    return this.admin.people();
  }

  @Post("admin/voice/people/:id/pause")
  @Roles(["ADMIN"])
  @HttpCode(200)
  pause(
    @CurrentUser() user: AuthUser,
    @Param("id", new ZodPipe(Id)) id: string,
    @Body(new ZodPipe(PauseBody)) body: z.infer<typeof PauseBody>,
  ) {
    return this.admin.setPaused(user, id, body.paused);
  }

  @Get("admin/voice/payouts")
  @Roles(["ADMIN"])
  payouts(@Query(new ZodPipe(PayoutsQuery)) q: z.infer<typeof PayoutsQuery>) {
    return this.admin.payouts(q.userId);
  }

  @Post("admin/voice/payouts")
  @Roles(["ADMIN"])
  @ApiOkResponse({ description: "Registar um pagamento feito por fora." })
  createPayout(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(PayoutBody)) body: z.infer<typeof PayoutBody>,
  ) {
    return this.admin.createPayout(user, body);
  }

  @Get("admin/voice/report")
  @Roles(["ADMIN"])
  @ApiOkResponse({ description: "Trabalho e valores por pessoa no período [from, to)." })
  report(@Query(new ZodPipe(ReportQuery)) q: z.infer<typeof ReportQuery>) {
    return this.admin.report(new Date(`${q.from}T00:00:00Z`), new Date(`${q.to}T00:00:00Z`));
  }
}
