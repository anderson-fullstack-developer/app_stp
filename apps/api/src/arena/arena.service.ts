import { Inject, Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import type { Prisma } from "../generated/prisma/client.js";
import { isPubliclyListed, visibleContentStatuses } from "../languages/visibility.js";
import { buildQuestions, type StoredQuestion, toPublicQuestion } from "../lessons/lesson-rules.js";
import { loadQuizItems } from "../lessons/quiz-items.js";
import { grantActivity, loadRewardTable } from "../progress/grant.js";
import { isValidTimeZone, localDate } from "../progress/rules/local-date.js";
import type {
  AnswerAck,
  MatchStanding,
  MatchView,
  PlayerView,
  RoomView,
  RoundQuestion,
} from "./arena.types.js";
import {
  ARENA_CONFIG,
  type AnswerOutcome,
  type ArenaConfig,
  type ArenaPlayer,
  alivePlayers,
  applySurvivalRound,
  createPlayers,
  generateRoomCode,
  normalizeConfig,
  rankRemaining,
  rewardEligible,
  survivalReward,
} from "./survival-rules.js";

/** Tempos do fluxo (os testes encurtam-nos). */
export interface ArenaTimings {
  countdownMs: number;
  /** Depois de revelar a resposta, até à ronda seguinte (feedback + resumo). */
  betweenRoundsMs: number;
  /** Ecrã "batalha final" quando ficam 2. */
  finalMs: number;
  /** Tolerância de rede para respostas depois do prazo. */
  lateGraceMs: number;
  /** Quanto tempo uma pessoa desligada na sala de espera fica antes de sair. */
  lobbyGraceMs: number;
}

export const ARENA_TIMINGS = Symbol("ARENA_TIMINGS");
export const DEFAULT_ARENA_TIMINGS: ArenaTimings = {
  countdownMs: 3_000,
  betweenRoundsMs: 4_100,
  finalMs: 2_600,
  lateGraceMs: 400,
  lobbyGraceMs: 20_000,
};

/** Quem está ligado (dados de apresentação lidos da BD na ligação). */
export interface ArenaIdentity {
  userId: string;
  username: string;
  name: string;
  avatarColor: string | null;
  uiLocale: string;
  learningLanguageId: string | null;
}

export class ArenaError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Para onde vão os eventos: o gateway liga isto ao Socket.IO. */
export type ArenaEmit = (
  target: { room: string } | { user: string },
  event: string,
  payload: unknown,
) => void;

interface Member {
  identity: ArenaIdentity;
  ready: boolean;
  connected: boolean;
  joinedAt: number;
  graceTimer: ReturnType<typeof setTimeout> | null;
}

interface Match {
  id: string;
  questions: StoredQuestion[];
  round: number;
  phase: MatchView["phase"];
  players: ArenaPlayer[];
  answers: Map<string, { optionId: string; at: number }>;
  deadlineAt: number | null;
  left: Set<string>;
  finalShown: boolean;
  timer: ReturnType<typeof setTimeout> | null;
}

interface Room {
  code: string;
  hostId: string;
  config: ArenaConfig;
  languageId: string;
  locale: string;
  members: Map<string, Member>;
  match: Match | null;
}

const LOCALES = ["pt", "en"];
const socketRoom = (code: string) => `arena:${code}`;

/**
 * Arena (Sobrevivência em salas privadas). O estado ao vivo fica em memória (ADR-08:
 * uma instância no MVP); o resultado vai para arena_matches. O servidor decide tudo:
 * perguntas, resposta certa, tempo oficial, vidas, lugares e recompensas.
 */
@Injectable()
export class ArenaService implements OnModuleDestroy {
  private readonly logger = new Logger(ArenaService.name);
  private readonly rooms = new Map<string, Room>();
  private readonly roomOf = new Map<string, string>();
  private emit: ArenaEmit = () => {};

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ARENA_TIMINGS) private readonly timings: ArenaTimings,
  ) {}

  setEmitter(emit: ArenaEmit) {
    this.emit = emit;
  }

  onModuleDestroy() {
    for (const room of this.rooms.values()) this.clearTimers(room);
  }

  /* ------------------------------- salas ------------------------------- */

  async createRoom(
    who: ArenaIdentity,
    input: { config?: Partial<ArenaConfig>; languageId?: string },
  ): Promise<RoomView> {
    this.assertNotPlaying(who.userId);
    this.leaveCurrent(who.userId);
    const languageId = input.languageId ?? who.learningLanguageId ?? "kabuverdianu";
    const language = await this.prisma.language.findUnique({
      where: { id: languageId },
      select: { status: true },
    });
    if (!language || !isPubliclyListed(language.status)) {
      throw new ArenaError("LANGUAGE_NOT_AVAILABLE", "Esta língua ainda não está disponível.");
    }
    let code = generateRoomCode(Math.random);
    while (this.rooms.has(code)) code = generateRoomCode(Math.random);
    const room: Room = {
      code,
      hostId: who.userId,
      config: normalizeConfig(input.config),
      languageId,
      locale: LOCALES.includes(who.uiLocale) ? who.uiLocale : "en",
      members: new Map(),
      match: null,
    };
    this.rooms.set(code, room);
    this.addMember(room, who);
    return this.view(room);
  }

  joinRoom(who: ArenaIdentity, rawCode: string): RoomView {
    const code = rawCode.trim().toUpperCase();
    const room = this.rooms.get(code);
    if (!room) throw new ArenaError("ROOM_NOT_FOUND", "Não existe nenhuma sala com esse código.");
    const existing = room.members.get(who.userId);
    if (existing) {
      // Voltar a entrar (outro separador, reconexão).
      this.markConnected(room, existing, true);
      return this.view(room);
    }
    this.assertNotPlaying(who.userId);
    if (room.match) throw new ArenaError("ROOM_STARTED", "A partida já começou.");
    if (room.members.size >= room.config.players) {
      throw new ArenaError("ROOM_FULL", "A sala está cheia.");
    }
    this.leaveCurrent(who.userId);
    this.addMember(room, who);
    this.broadcastRoom(room);
    return this.view(room);
  }

  leave(userId: string) {
    const code = this.roomOf.get(userId);
    const room = code ? this.rooms.get(code) : undefined;
    if (!room) return;
    const member = room.members.get(userId);
    if (member?.graceTimer) clearTimeout(member.graceTimer);
    if (room.match && room.match.players.some((p) => p.id === userId)) {
      // A meio da partida: abandona (sem recompensa) e deixa de bloquear as rondas.
      room.match.left.add(userId);
      if (member) member.connected = false;
      this.roomOf.delete(userId);
      this.maybeResolveEarly(room);
      this.cancelIfEmpty(room);
      this.broadcastRoom(room);
      return;
    }
    room.members.delete(userId);
    this.roomOf.delete(userId);
    if (room.members.size === 0) {
      this.closeRoom(room, "empty");
      return;
    }
    if (room.hostId === userId) {
      // O anfitrião passa para quem entrou primeiro.
      const next = [...room.members.values()].sort((a, b) => a.joinedAt - b.joinedAt)[0]!;
      room.hostId = next.identity.userId;
      next.ready = false;
    }
    this.broadcastRoom(room);
  }

  setReady(userId: string, ready: boolean): RoomView {
    const room = this.requireRoom(userId);
    if (room.match) throw new ArenaError("ROOM_STARTED", "A partida já começou.");
    room.members.get(userId)!.ready = ready;
    this.broadcastRoom(room);
    return this.view(room);
  }

  /** Ligação caiu: na sala de espera há um período de graça; na partida, só fica sem responder. */
  disconnected(userId: string) {
    const code = this.roomOf.get(userId);
    const room = code ? this.rooms.get(code) : undefined;
    const member = room?.members.get(userId);
    if (!room || !member) return;
    this.markConnected(room, member, false);
    if (!room.match) {
      member.graceTimer = setTimeout(() => this.leave(userId), this.timings.lobbyGraceMs);
    } else {
      this.maybeResolveEarly(room);
      this.cancelIfEmpty(room);
    }
  }

  /** Reconexão: devolve o estado completo da sala e da partida. */
  resync(userId: string): { room: RoomView; match: MatchView | null } | null {
    const code = this.roomOf.get(userId);
    const room = code ? this.rooms.get(code) : undefined;
    const member = room?.members.get(userId);
    if (!room || !member) return null;
    this.markConnected(room, member, true);
    return { room: this.view(room), match: room.match ? this.matchView(room.match) : null };
  }

  /** Nome da sala no Socket.IO onde está o utilizador (para o gateway juntar o socket). */
  socketRoomOf(userId: string): string | null {
    const code = this.roomOf.get(userId);
    return code ? socketRoom(code) : null;
  }

  /* ------------------------------ partida ------------------------------ */

  async start(userId: string): Promise<void> {
    const room = this.requireRoom(userId);
    if (room.hostId !== userId) throw new ArenaError("NOT_HOST", "Só o anfitrião pode começar.");
    if (room.match) throw new ArenaError("ROOM_STARTED", "A partida já começou.");
    const members = [...room.members.values()].filter((m) => m.connected);
    if (members.length < ARENA_CONFIG.minPlayersToStart) {
      throw new ArenaError("NOT_ENOUGH_PLAYERS", "São precisos pelo menos 2 jogadores.");
    }
    if (members.some((m) => m.identity.userId !== room.hostId && !m.ready)) {
      throw new ArenaError("NOT_READY", "Ainda há jogadores que não estão prontos.");
    }

    const questions = await this.loadQuestions(room.languageId, room.locale);
    if (questions.length < 4) {
      throw new ArenaError("NO_QUESTIONS", "Ainda não há perguntas suficientes nesta língua.");
    }
    const playerIds = members.map((m) => m.identity.userId);
    const row = await this.prisma.arenaMatch.create({
      data: {
        roomCode: room.code,
        mode: "survival",
        languageId: room.languageId,
        locale: room.locale,
        hostId: room.hostId,
        lives: room.config.lives,
        seconds: room.config.seconds,
        players: { create: playerIds.map((id) => ({ userId: id })) },
      },
      select: { id: true },
    });
    // Quem estava desligado na sala de espera não entra na partida.
    for (const m of room.members.values()) {
      if (!m.connected) {
        if (m.graceTimer) clearTimeout(m.graceTimer);
        room.members.delete(m.identity.userId);
        this.roomOf.delete(m.identity.userId);
      }
    }
    const match: Match = {
      id: row.id,
      questions,
      round: 0,
      phase: "countdown",
      players: createPlayers(playerIds, room.config.lives),
      answers: new Map(),
      deadlineAt: null,
      left: new Set(),
      finalShown: false,
      timer: null,
    };
    room.match = match;
    this.broadcastRoom(room);
    const startsAt = Date.now() + this.timings.countdownMs;
    this.emit({ room: socketRoom(room.code) }, "match:countdown", {
      matchId: match.id,
      startsAt,
      serverNow: Date.now(),
    });
    this.schedule(room, () => this.nextQuestion(room), this.timings.countdownMs);
  }

  answer(userId: string, input: { questionId: string; optionId: string }): AnswerAck {
    const code = this.roomOf.get(userId);
    const room = code ? this.rooms.get(code) : undefined;
    const match = room?.match;
    const player = match?.players.find((p) => p.id === userId);
    if (!room || !match || !player || match.left.has(userId)) {
      return { accepted: false, reason: "not_in_match" };
    }
    if (player.lives <= 0) return { accepted: false, reason: "eliminated" };
    const q = this.currentQuestion(match);
    if (
      match.phase !== "question" ||
      !q ||
      input.questionId !== this.questionId(match) ||
      Date.now() > (match.deadlineAt ?? 0) + this.timings.lateGraceMs
    ) {
      return { accepted: false, reason: "late" };
    }
    if (match.answers.has(userId)) return { accepted: false, reason: "duplicate" };
    if (!q.options.some((o) => o.id === input.optionId)) {
      return { accepted: false, reason: "invalid_option" };
    }
    match.answers.set(userId, { optionId: input.optionId, at: Date.now() });
    this.emit({ room: socketRoom(room.code) }, "match:answered", {
      round: match.round,
      count: match.answers.size,
    });
    this.maybeResolveEarly(room);
    return { accepted: true };
  }

  private nextQuestion(room: Room) {
    const match = room.match;
    if (!match) return;
    match.round += 1;
    match.answers.clear();
    match.phase = "question";
    match.deadlineAt = Date.now() + room.config.seconds * 1000;
    this.emit({ room: socketRoom(room.code) }, "match:question", {
      matchId: match.id,
      round: match.round,
      question: this.publicQuestion(match),
      deadlineAt: match.deadlineAt,
      serverNow: Date.now(),
    });
    this.schedule(
      room,
      () => this.resolveRound(room),
      room.config.seconds * 1000 + this.timings.lateGraceMs,
    );
  }

  /** Fecha a ronda mais cedo quando todos os que ainda podem responder já responderam. */
  private maybeResolveEarly(room: Room) {
    const match = room.match;
    if (!match || match.phase !== "question") return;
    const waiting = alivePlayers(match.players).filter(
      (p) => !match.left.has(p.id) && room.members.get(p.id)?.connected && !match.answers.has(p.id),
    );
    if (waiting.length === 0) this.resolveRound(room);
  }

  private resolveRound(room: Room) {
    const match = room.match;
    if (!match || match.phase !== "question") return;
    this.clearTimer(match);
    const q = this.currentQuestion(match)!;
    const outcomes: Record<string, AnswerOutcome> = {};
    for (const p of alivePlayers(match.players)) {
      const a = match.answers.get(p.id);
      outcomes[p.id] = !a ? "timeout" : a.optionId === q.correctOptionId ? "correct" : "wrong";
    }
    const { players, summary } = applySurvivalRound(match.players, outcomes, match.round);
    match.players = players;
    match.phase = "reveal";
    match.deadlineAt = null;
    this.emit({ room: socketRoom(room.code) }, "match:reveal", {
      matchId: match.id,
      round: match.round,
      questionId: this.questionId(match),
      correctOptionId: q.correctOptionId,
      outcomes,
      players: this.playerViews(match),
      summary,
    });

    const alive = alivePlayers(match.players);
    const stillPlaying = alive.filter((p) => !match.left.has(p.id));
    if (alive.length <= 1 || stillPlaying.length === 0 || match.round >= ARENA_CONFIG.maxRounds) {
      this.schedule(room, () => void this.finish(room), this.timings.betweenRoundsMs);
      return;
    }
    if (alive.length === 2 && !match.finalShown) {
      match.finalShown = true;
      this.schedule(
        room,
        () => {
          match.phase = "final";
          this.emit({ room: socketRoom(room.code) }, "match:final", {
            matchId: match.id,
            userIds: alive.map((p) => p.id),
          });
          this.schedule(room, () => this.nextQuestion(room), this.timings.finalMs);
        },
        this.timings.betweenRoundsMs,
      );
      return;
    }
    this.schedule(room, () => this.nextQuestion(room), this.timings.betweenRoundsMs);
  }

  private async finish(room: Room) {
    const match = room.match;
    if (!match || match.phase === "finished") return;
    match.phase = "finished";
    this.clearTimer(match);
    const ranked = rankRemaining(match.players).sort(
      (a, b) => (a.placement ?? 99) - (b.placement ?? 99),
    );
    const eligible = rewardEligible(true, match.players.length);
    const table = await loadRewardTable(this.prisma);
    const now = new Date();
    const rewards = new Map<string, { xp: number; coins: number; reason: string }>();

    for (const p of ranked) {
      const left = match.left.has(p.id);
      let reward = { xp: 0, coins: 0, reason: left ? "left" : eligible ? "ok" : "private_small" };
      if (!left && eligible) {
        const r = survivalReward(p.placement ?? ranked.length);
        try {
          reward = await this.prisma.$transaction(async (tx) => {
            if (await this.dailyLimitReached(tx, p.id, now)) {
              return { xp: 0, coins: 0, reason: "daily_limit" };
            }
            await grantActivity(tx, {
              userId: p.id,
              now,
              sourceType: "arena_match",
              sourceId: match.id,
              xp: [{ reason: "ARENA_PLACE", amount: r.xp }],
              coins: [{ reason: "ARENA_PLACE", amount: r.coins }],
              correctAnswersDelta: p.correct,
              lessonsCompletedDelta: 0,
              table,
            });
            return { ...r, reason: "ok" };
          });
        } catch (e) {
          this.logger.error({ err: e, matchId: match.id, userId: p.id }, "Falha a pagar a Arena");
          reward = { xp: 0, coins: 0, reason: "ok" };
        }
      }
      rewards.set(p.id, reward);
      await this.prisma.arenaMatchPlayer.update({
        where: { matchId_userId: { matchId: match.id, userId: p.id } },
        data: {
          place: p.placement,
          correct: p.correct,
          wrong: p.wrong,
          timeouts: p.timeouts,
          left,
          xp: reward.xp,
          coins: reward.coins,
        },
      });
    }
    await this.prisma.arenaMatch.update({
      where: { id: match.id },
      data: { status: "FINISHED", rounds: match.round, rewarded: eligible, finishedAt: now },
    });

    const people = await this.prisma.user.findMany({
      where: { id: { in: ranked.map((p) => p.id) } },
      select: { id: true, username: true, name: true, avatarColor: true },
    });
    const byId = new Map(people.map((u) => [u.id, u]));
    const standings: MatchStanding[] = ranked.map((p) => ({
      userId: p.id,
      username: byId.get(p.id)?.username ?? "",
      name: byId.get(p.id)?.name ?? "",
      avatarColor: byId.get(p.id)?.avatarColor ?? null,
      place: p.placement ?? ranked.length,
      correct: p.correct,
      wrong: p.wrong,
      timeouts: p.timeouts,
      left: match.left.has(p.id),
    }));
    this.emit({ room: socketRoom(room.code) }, "match:finished", {
      matchId: match.id,
      standings,
      rewarded: eligible,
      rounds: match.round,
    });
    for (const [userId, r] of rewards) {
      this.emit({ user: userId }, "match:reward", { matchId: match.id, ...r });
    }

    // A sala volta à espera para poderem jogar outra vez; quem saiu já não está nela.
    room.match = null;
    for (const id of match.left) room.members.delete(id);
    for (const m of room.members.values()) m.ready = false;
    if (room.members.size === 0) this.closeRoom(room, "empty");
    else {
      if (!room.members.has(room.hostId)) {
        room.hostId = [...room.members.values()].sort(
          (a, b) => a.joinedAt - b.joinedAt,
        )[0]!.identity.userId;
      }
      this.broadcastRoom(room);
    }
  }

  /** No máximo 10 partidas premiadas por dia local (REGRAS §9). */
  private async dailyLimitReached(tx: Prisma.TransactionClient, userId: string, now: Date) {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { timezone: true },
    });
    const tz = isValidTimeZone(user.timezone) ? user.timezone : "Europe/Lisbon";
    const today = new Date(`${localDate(now, tz)}T00:00:00Z`);
    const count = await tx.xpEvent.count({
      where: { userId, reason: "ARENA_PLACE", localDate: today },
    });
    return count >= ARENA_CONFIG.maxRewardedMatchesPerDay;
  }

  /** Partida sem ninguém ligado: cancela (sem recompensas). */
  private cancelIfEmpty(room: Room) {
    const match = room.match;
    if (!match) return;
    const anyone = match.players.some(
      (p) => !match.left.has(p.id) && room.members.get(p.id)?.connected,
    );
    if (anyone) return;
    this.clearTimer(match);
    void this.prisma.arenaMatch
      .update({
        where: { id: match.id },
        data: { status: "CANCELLED", rounds: match.round, finishedAt: new Date() },
      })
      .catch(() => {});
    this.closeRoom(room, "empty");
  }

  /* ------------------------------ auxiliares ------------------------------ */

  private async loadQuestions(languageId: string, locale: string): Promise<StoredQuestion[]> {
    const language = await this.prisma.language.findUniqueOrThrow({
      where: { id: languageId },
      select: { status: true },
    });
    const items = await loadQuizItems(
      this.prisma,
      { languageId, status: { in: visibleContentStatuses(language.status) } },
      locale,
    );
    // Uma palavra por pergunta (sem repetições), por ordem aleatória.
    const unique = [...new Map(items.map((i) => [i.vocabularyId, i])).values()];
    const chosen = unique.sort(() => Math.random() - 0.5).slice(0, ARENA_CONFIG.maxRounds);
    return buildQuestions(chosen, unique, Math.random).filter((q) => q.options.length >= 2);
  }

  private currentQuestion(match: Match): StoredQuestion | undefined {
    return match.questions[(match.round - 1) % match.questions.length];
  }

  private questionId(match: Match) {
    return `${match.id}:${match.round}`;
  }

  private publicQuestion(match: Match): RoundQuestion {
    return {
      ...toPublicQuestion(this.currentQuestion(match)!),
      questionId: this.questionId(match),
    };
  }

  private playerViews(match: Match): PlayerView[] {
    return match.players.map((p) => ({
      userId: p.id,
      lives: p.lives,
      correct: p.correct,
      wrong: p.wrong,
      timeouts: p.timeouts,
      placement: p.placement,
      eliminated: p.lives <= 0,
      left: match.left.has(p.id),
    }));
  }

  private matchView(match: Match): MatchView {
    return {
      matchId: match.id,
      phase: match.phase,
      round: match.round,
      deadlineAt: match.deadlineAt,
      question: match.phase === "question" ? this.publicQuestion(match) : null,
      players: this.playerViews(match),
      answeredCount: match.answers.size,
    };
  }

  private view(room: Room): RoomView {
    return {
      code: room.code,
      hostId: room.hostId,
      status: room.match ? "IN_PROGRESS" : "WAITING",
      mode: "survival",
      config: room.config,
      languageId: room.languageId,
      locale: room.locale,
      members: [...room.members.values()]
        .sort((a, b) => a.joinedAt - b.joinedAt)
        .map((m) => ({
          userId: m.identity.userId,
          username: m.identity.username,
          name: m.identity.name,
          avatarColor: m.identity.avatarColor,
          ready: m.identity.userId === room.hostId || m.ready,
          connected: m.connected,
          isHost: m.identity.userId === room.hostId,
        })),
    };
  }

  private addMember(room: Room, who: ArenaIdentity) {
    room.members.set(who.userId, {
      identity: who,
      ready: false,
      connected: true,
      joinedAt: Date.now() + room.members.size, // ordem estável mesmo no mesmo ms
      graceTimer: null,
    });
    this.roomOf.set(who.userId, room.code);
  }

  private markConnected(room: Room, member: Member, connected: boolean) {
    if (member.graceTimer) {
      clearTimeout(member.graceTimer);
      member.graceTimer = null;
    }
    if (member.connected === connected) return;
    member.connected = connected;
    this.broadcastRoom(room);
  }

  private broadcastRoom(room: Room) {
    this.emit({ room: socketRoom(room.code) }, "room:state", this.view(room));
  }

  private closeRoom(room: Room, reason: "host_left" | "empty") {
    this.clearTimers(room);
    for (const id of room.members.keys()) {
      if (this.roomOf.get(id) === room.code) this.roomOf.delete(id);
    }
    this.rooms.delete(room.code);
    this.emit({ room: socketRoom(room.code) }, "room:closed", { code: room.code, reason });
  }

  private requireRoom(userId: string): Room {
    const code = this.roomOf.get(userId);
    const room = code ? this.rooms.get(code) : undefined;
    if (!room) throw new ArenaError("NOT_IN_ROOM", "Não estás em nenhuma sala.");
    return room;
  }

  private assertNotPlaying(userId: string) {
    const code = this.roomOf.get(userId);
    const room = code ? this.rooms.get(code) : undefined;
    if (
      room?.match &&
      room.match.players.some((p) => p.id === userId) &&
      !room.match.left.has(userId)
    ) {
      throw new ArenaError("IN_MATCH", "Estás a meio de uma partida.");
    }
  }

  private leaveCurrent(userId: string) {
    if (this.roomOf.has(userId)) this.leave(userId);
  }

  private schedule(room: Room, fn: () => void, ms: number) {
    const match = room.match;
    if (!match) return;
    this.clearTimer(match);
    match.timer = setTimeout(() => {
      match.timer = null;
      try {
        fn();
      } catch (e) {
        this.logger.error({ err: e, code: room.code }, "Erro no fluxo da Arena");
      }
    }, ms);
  }

  private clearTimer(match: Match) {
    if (match.timer) clearTimeout(match.timer);
    match.timer = null;
  }

  private clearTimers(room: Room) {
    if (room.match) this.clearTimer(room.match);
    for (const m of room.members.values()) if (m.graceTimer) clearTimeout(m.graceTimer);
  }
}
