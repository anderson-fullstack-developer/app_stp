import { Inject, Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { SocialService } from "../social/social.service.js";
import type { Prisma } from "../generated/prisma/client.js";
import { isPubliclyListed, visibleContentStatuses } from "../languages/visibility.js";
import {
  buildQuestions,
  type QuizItem,
  type StoredQuestion,
  toPublicQuestion,
} from "../lessons/lesson-rules.js";
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
  duelReward,
  generateRoomCode,
  normalizeConfig,
  rankDuel,
  rankRemaining,
  rankTeams,
  type TeamId,
  rewardEligible,
  scoreAnswer,
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
  /** 2 contra 2: equipa escolhida na sala de espera. */
  team: TeamId | null;
}

export type ArenaMode = "survival" | "duel" | "teams";

interface Match {
  id: string;
  mode: ArenaMode;
  /** 2 contra 2: equipa de cada jogador (fixa durante a partida). */
  teams: Map<string, TeamId>;
  /** Duelo: pontos e tempo total de resposta (ms) por jogador. */
  scores: Map<string, number>;
  answerMs: Map<string, number>;
  questions: StoredQuestion[];
  round: number;
  phase: MatchView["phase"];
  players: ArenaPlayer[];
  answers: Map<string, { optionId: string; at: number }>;
  deadlineAt: number | null;
  /** Saíram ainda vivos: abandono, sem recompensa. */
  left: Set<string>;
  /** Todos os que saíram (incluindo eliminados que deixaram de ver). */
  departed: Set<string>;
  finalShown: boolean;
  timer: ReturnType<typeof setTimeout> | null;
}

/** Convite para uma sala (em memória; expira ou deixa de valer quando a sala começa/fecha). */
export interface ArenaInvite {
  code: string;
  mode: ArenaMode;
  from: { userId: string; username: string; name: string; avatarColor: string | null };
  at: number;
  expiresAt: number;
}

const INVITE_TTL_MS = 10 * 60 * 1000;
const MAX_INVITES_PER_ROOM = 30;

interface Room {
  mode: ArenaMode;
  invitesSent: number;
  code: string;
  hostId: string;
  config: ArenaConfig;
  languageId: string;
  locale: string;
  members: Map<string, Member>;
  match: Match | null;
}

const LOCALES = ["pt", "en"];
const QUIZ_CACHE_MS = 5 * 60 * 1000;
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
  private readonly invites = new Map<string, ArenaInvite[]>();
  private emit: ArenaEmit = () => {};

  constructor(
    private readonly prisma: PrismaService,
    private readonly social: SocialService,
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
    input: { config?: Partial<ArenaConfig>; languageId?: string; mode?: ArenaMode },
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
    const mode = input.mode ?? "survival";
    const room: Room = {
      mode,
      code,
      hostId: who.userId,
      config:
        mode === "duel"
          ? { players: 2, lives: 1, seconds: ARENA_CONFIG.duel.seconds }
          : mode === "teams"
            ? { players: 4, lives: 1, seconds: ARENA_CONFIG.teams.seconds }
            : normalizeConfig(input.config),
      languageId,
      locale: LOCALES.includes(who.uiLocale) ? who.uiLocale : "en",
      members: new Map(),
      match: null,
      invitesSent: 0,
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
    if (room.mode === "duel" && room.members.size === 2) {
      // Duelo: começa sozinho quando o adversário entra.
      void this.start(room.hostId).catch((e: unknown) => {
        this.logger.warn({ err: e, code: room.code }, "Duelo não arrancou");
      });
    }
    return this.view(room);
  }

  leave(userId: string) {
    const code = this.roomOf.get(userId);
    const room = code ? this.rooms.get(code) : undefined;
    if (!room) return;
    const member = room.members.get(userId);
    if (member?.graceTimer) clearTimeout(member.graceTimer);
    if (room.match && room.match.players.some((p) => p.id === userId)) {
      // A meio da partida: quem ainda está vivo abandona (sem recompensa); quem já foi
      // eliminado só deixa de ver — mantém o lugar e a recompensa.
      const alive = room.match.players.some((p) => p.id === userId && p.lives > 0);
      if (alive) room.match.left.add(userId);
      room.match.departed.add(userId);
      if (room.match.mode === "duel") {
        // Duelo: quem fica ganha logo.
        this.clearTimer(room.match);
        this.roomOf.delete(userId);
        if (member) member.connected = false;
        void this.finish(room);
        return;
      }
      if (member) member.connected = false;
      this.roomOf.delete(userId);
      if (room.match.mode === "teams" && this.teamGone(room, room.match)) {
        this.clearTimer(room.match);
        void this.finish(room);
        return;
      }
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

  /** 2 contra 2: mudar de equipa na sala de espera (máximo 2 por equipa). */
  setTeam(userId: string, team: TeamId): RoomView {
    const room = this.requireRoom(userId);
    if (room.mode !== "teams") throw new ArenaError("NOT_TEAMS", "Esta sala não é de equipas.");
    if (room.match) throw new ArenaError("ROOM_STARTED", "A partida já começou.");
    const member = room.members.get(userId)!;
    if (member.team !== team) {
      const taken = [...room.members.values()].filter((m) => m.team === team).length;
      if (taken >= 2) throw new ArenaError("TEAM_FULL", "Essa equipa já tem 2 jogadores.");
      member.team = team;
      member.ready = false;
      this.broadcastRoom(room);
    }
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

  /**
   * Convidar um amigo (amizade aceite, sem bloqueios) para a minha sala à espera.
   * Chega em tempo real (se estiver ligado) e aparece nas notificações.
   */
  async invite(who: ArenaIdentity, friendId: string): Promise<void> {
    const room = this.requireRoom(who.userId);
    if (room.match) throw new ArenaError("ROOM_STARTED", "A partida já começou.");
    if (room.members.has(friendId)) {
      throw new ArenaError("ALREADY_IN_ROOM", "Já está na sala.");
    }
    if (room.members.size >= room.config.players) {
      throw new ArenaError("ROOM_FULL", "A sala está cheia.");
    }
    if (room.invitesSent >= MAX_INVITES_PER_ROOM) {
      throw new ArenaError("TOO_MANY_INVITES", "Já enviaste convites suficientes.");
    }
    const friends = await this.social.friendIds(who.userId);
    if (!friends.includes(friendId)) {
      throw new ArenaError("NOT_FRIENDS", "Só podes convidar amigos.");
    }
    room.invitesSent += 1;
    const invite: ArenaInvite = {
      code: room.code,
      mode: room.mode,
      from: {
        userId: who.userId,
        username: who.username,
        name: who.name,
        avatarColor: who.avatarColor,
      },
      at: Date.now(),
      expiresAt: Date.now() + INVITE_TTL_MS,
    };
    const list = (this.invites.get(friendId) ?? []).filter(
      (i) => !(i.code === room.code && i.from.userId === who.userId),
    );
    this.invites.set(friendId, [...list, invite]);
    this.emit({ user: friendId }, "arena:invite", invite);
  }

  /** Desafiar um amigo para um duelo: cria a sala de 2 e envia-lhe o convite. */
  async challenge(who: ArenaIdentity, friendId: string, languageId?: string): Promise<RoomView> {
    if (friendId === who.userId) throw new ArenaError("NOT_FRIENDS", "Só podes desafiar amigos.");
    const friends = await this.social.friendIds(who.userId);
    if (!friends.includes(friendId)) {
      throw new ArenaError("NOT_FRIENDS", "Só podes desafiar amigos.");
    }
    const room = await this.createRoom(who, {
      mode: "duel",
      ...(languageId ? { languageId } : {}),
    });
    await this.invite(who, friendId);
    return room;
  }

  /** Convites ainda válidos (sala existe, à espera e com lugar). */
  invitesFor(userId: string): ArenaInvite[] {
    const now = Date.now();
    const valid = (this.invites.get(userId) ?? []).filter((i) => {
      const room = this.rooms.get(i.code);
      return (
        i.expiresAt > now &&
        room &&
        !room.match &&
        !room.members.has(userId) &&
        room.members.size < room.config.players
      );
    });
    if (valid.length) this.invites.set(userId, valid);
    else this.invites.delete(userId);
    return valid;
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
    if (
      room.mode !== "duel" &&
      members.some((m) => m.identity.userId !== room.hostId && !m.ready)
    ) {
      throw new ArenaError("NOT_READY", "Ainda há jogadores que não estão prontos.");
    }

    const questions = await this.loadQuestions(room.languageId, room.locale);
    if (questions.length < 4) {
      throw new ArenaError("NO_QUESTIONS", "Ainda não há perguntas suficientes nesta língua.");
    }
    if (room.mode === "teams") {
      const count = (t: TeamId) => members.filter((m) => m.team === t).length;
      if (members.length !== 4 || count("A") !== 2 || count("B") !== 2) {
        throw new ArenaError("TEAMS_INCOMPLETE", "São precisas 2 pessoas em cada equipa.");
      }
    }
    const playerIds = members.map((m) => m.identity.userId);
    const row = await this.prisma.arenaMatch.create({
      data: {
        roomCode: room.code,
        mode: room.mode,
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
      mode: room.mode,
      teams: new Map(members.filter((m) => m.team).map((m) => [m.identity.userId, m.team!])),
      scores: new Map(playerIds.map((id) => [id, 0])),
      answerMs: new Map(playerIds.map((id) => [id, 0])),
      questions,
      round: 0,
      phase: "countdown",
      players: createPlayers(playerIds, room.config.lives),
      answers: new Map(),
      deadlineAt: null,
      left: new Set(),
      departed: new Set(),
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
    if (!room || !match || !player || match.departed.has(userId)) {
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
    if (match.mode !== "survival") {
      this.resolvePointsRound(room, match, q.correctOptionId, outcomes);
      return;
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

  /** Duelo: ninguém perde vidas; soma pontos (certa + rapidez) e tempo de resposta. */
  private resolvePointsRound(
    room: Room,
    match: Match,
    correctOptionId: string,
    outcomes: Record<string, AnswerOutcome>,
  ) {
    const totalMs = room.config.seconds * 1000;
    const startedAt = (match.deadlineAt ?? Date.now()) - totalMs;
    match.players = match.players.map((p) => {
      const o = outcomes[p.id] ?? "timeout";
      const a = match.answers.get(p.id);
      const used = a ? Math.min(totalMs, Math.max(0, a.at - startedAt)) : totalMs;
      match.answerMs.set(p.id, (match.answerMs.get(p.id) ?? 0) + used);
      match.scores.set(
        p.id,
        (match.scores.get(p.id) ?? 0) + scoreAnswer(o === "correct", 1 - used / totalMs),
      );
      return o === "correct"
        ? { ...p, correct: p.correct + 1 }
        : o === "wrong"
          ? { ...p, wrong: p.wrong + 1 }
          : { ...p, timeouts: p.timeouts + 1 };
    });
    const counts = Object.values(outcomes);
    match.phase = "reveal";
    match.deadlineAt = null;
    this.emit({ room: socketRoom(room.code) }, "match:reveal", {
      matchId: match.id,
      round: match.round,
      questionId: this.questionId(match),
      correctOptionId,
      outcomes,
      players: this.playerViews(match),
      summary: {
        round: match.round,
        correct: counts.filter((o) => o === "correct").length,
        wrong: counts.filter((o) => o === "wrong").length,
        noAnswer: counts.filter((o) => o === "timeout").length,
        eliminated: [],
        alive: match.players.length,
        voided: false,
      },
    });
    const total =
      match.mode === "duel" ? ARENA_CONFIG.duel.questions : ARENA_CONFIG.teams.questions;
    const done =
      match.round >= total ||
      (match.mode === "duel" && match.left.size > 0) ||
      (match.mode === "teams" && this.teamGone(room, match));
    this.schedule(
      room,
      () => (done ? void this.finish(room) : this.nextQuestion(room)),
      this.timings.betweenRoundsMs,
    );
  }

  private async finish(room: Room) {
    const match = room.match;
    if (!match || match.phase === "finished") return;
    match.phase = "finished";
    this.clearTimer(match);
    const duel = match.mode === "duel";
    const teams = match.mode === "teams";
    const scoreRows = match.players.map((p) => ({
      id: p.id,
      score: match.scores.get(p.id) ?? 0,
      correct: p.correct,
      answerMs: match.answerMs.get(p.id) ?? 0,
      left: match.left.has(p.id),
      team: (match.teams.get(p.id) ?? "A") as TeamId,
    }));
    const teamResult = teams ? rankTeams(scoreRows) : null;
    const pointPlaces = duel ? rankDuel(scoreRows) : (teamResult?.places ?? null);
    const ranked = (
      pointPlaces
        ? match.players.map((p) => ({ ...p, placement: pointPlaces.get(p.id) ?? 2 }))
        : rankRemaining(match.players)
    ).sort(
      (a, b) =>
        (a.placement ?? 99) - (b.placement ?? 99) ||
        (match.scores.get(b.id) ?? 0) - (match.scores.get(a.id) ?? 0),
    );
    // Duelo entre amigos paga (até 3 por dia); 2 contra 2 tem sempre 4 jogadores reais;
    // Sobrevivência privada só com 4+ jogadores.
    const eligible = duel || teams || rewardEligible(true, match.players.length);
    const table = await loadRewardTable(this.prisma);
    const now = new Date();
    const rewards = new Map<string, { xp: number; coins: number; reason: string }>();

    for (const p of ranked) {
      const left = match.left.has(p.id);
      let reward = { xp: 0, coins: 0, reason: left ? "left" : eligible ? "ok" : "private_small" };
      if (!left && eligible) {
        const place = p.placement ?? ranked.length;
        const r = duel || teams ? duelReward(place) : survivalReward(place);
        const pay = () =>
          this.prisma.$transaction(
            async (tx) => {
              const limit = await this.dailyLimitReached(tx, p.id, now, duel);
              if (limit) return { xp: 0, coins: 0, reason: limit };
              await grantActivity(tx, {
                userId: p.id,
                now,
                sourceType: duel ? "arena_duel" : teams ? "arena_teams" : "arena_match",
                sourceId: match.id,
                xp: [{ reason: duel && place === 1 ? "DUEL_WIN" : "ARENA_PLACE", amount: r.xp }],
                coins: [{ reason: "ARENA_PLACE", amount: r.coins }],
                correctAnswersDelta: p.correct,
                lessonsCompletedDelta: 0,
                table,
              });
              return { ...r, reason: "ok" };
            },
            // Com a base de dados lenta, 5 s (o padrão) não chegam para pagar com segurança.
            { maxWait: 10_000, timeout: 20_000 },
          );
        try {
          reward = await pay();
        } catch (first) {
          // Uma nova tentativa é segura: o pagamento é idempotente (mesma partida = mesma chave).
          this.logger.warn(
            { err: first, matchId: match.id, userId: p.id },
            "A repetir o pagamento",
          );
          try {
            reward = await pay();
          } catch (e) {
            this.logger.error({ err: e, matchId: match.id, userId: p.id }, "Falha a pagar a Arena");
            reward = { xp: 0, coins: 0, reason: "error" };
          }
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
      score: match.scores.get(p.id) ?? 0,
      team: match.teams.get(p.id) ?? null,
    }));
    this.emit({ room: socketRoom(room.code) }, "match:finished", {
      matchId: match.id,
      standings,
      rewarded: eligible,
      rounds: match.round,
      ...(teamResult
        ? {
            teams: { A: teamResult.totals.A.score, B: teamResult.totals.B.score },
            winnerTeam: teamResult.winner,
          }
        : {}),
    });
    for (const [userId, r] of rewards) {
      this.emit({ user: userId }, "match:reward", { matchId: match.id, ...r });
    }

    // A sala volta à espera para poderem jogar outra vez; quem saiu já não está nela.
    room.match = null;
    for (const id of match.departed) room.members.delete(id);
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

  /**
   * Limites diários (dia local): no máximo 10 partidas premiadas (REGRAS §9) e, dessas,
   * 3 duelos. Devolve o motivo quando já não paga, ou null.
   */
  private async dailyLimitReached(
    tx: Prisma.TransactionClient,
    userId: string,
    now: Date,
    duel: boolean,
  ): Promise<"daily_limit" | "duel_limit" | null> {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { timezone: true },
    });
    const tz = isValidTimeZone(user.timezone) ? user.timezone : "Europe/Lisbon";
    const today = new Date(`${localDate(now, tz)}T00:00:00Z`);
    const rows = await tx.xpEvent.groupBy({
      by: ["sourceType"],
      where: {
        userId,
        localDate: today,
        sourceType: { in: ["arena_match", "arena_duel", "arena_teams"] },
      },
      _count: true,
    });
    const count = (t: string) => rows.find((r) => r.sourceType === t)?._count ?? 0;
    const all = count("arena_match") + count("arena_duel") + count("arena_teams");
    if (all >= ARENA_CONFIG.maxRewardedMatchesPerDay) {
      return "daily_limit";
    }
    if (duel && count("arena_duel") >= ARENA_CONFIG.maxRewardedDuelsPerDay) return "duel_limit";
    return null;
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

  /**
   * Palavras da língua para perguntas, em memória durante uns minutos: assim começar uma
   * partida não lê o vocabulário todo da base de dados de cada vez. O conteúdo aprovado
   * muda pouco; uma palavra nova aparece na Arena no máximo após QUIZ_CACHE_MS.
   */
  private readonly quizCache = new Map<string, { at: number; items: QuizItem[] }>();

  private async quizItems(languageId: string, locale: string): Promise<QuizItem[]> {
    const key = `${languageId}:${locale}`;
    const hit = this.quizCache.get(key);
    if (hit && Date.now() - hit.at < QUIZ_CACHE_MS) return hit.items;
    const language = await this.prisma.language.findUniqueOrThrow({
      where: { id: languageId },
      select: { status: true },
    });
    const items = await loadQuizItems(
      this.prisma,
      { languageId },
      locale,
      visibleContentStatuses(language.status),
    );
    // Uma entrada por palavra (a mesma palavra pode estar em vários exercícios).
    const unique = [...new Map(items.map((i) => [i.vocabularyId, i])).values()];
    this.quizCache.set(key, { at: Date.now(), items: unique });
    return unique;
  }

  private async loadQuestions(languageId: string, locale: string): Promise<StoredQuestion[]> {
    const pool = await this.quizItems(languageId, locale);
    // Fisher–Yates: ordem aleatória sem viés; sem repetir palavras na partida.
    const chosen = [...pool];
    for (let i = chosen.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chosen[i], chosen[j]] = [chosen[j]!, chosen[i]!];
    }
    return buildQuestions(chosen.slice(0, ARENA_CONFIG.maxRounds), pool, Math.random).filter(
      (q) => q.options.length >= 2,
    );
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
      eliminated: match.mode === "survival" && p.lives <= 0,
      left: match.left.has(p.id),
      score: match.scores.get(p.id) ?? 0,
      team: match.teams.get(p.id) ?? null,
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
      mode: room.mode,
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
          team: m.team,
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
      team: room.mode === "teams" ? this.openTeam(room) : null,
    });
    this.roomOf.set(who.userId, room.code);
  }

  /** Equipa com menos gente (para quem acabou de entrar). */
  private openTeam(room: Room): TeamId {
    const inA = [...room.members.values()].filter((m) => m.team === "A").length;
    const inB = [...room.members.values()].filter((m) => m.team === "B").length;
    return inA <= inB ? "A" : "B";
  }

  /** 2 contra 2: alguma equipa ficou sem ninguém a jogar? */
  private teamGone(room: Room, match: Match): boolean {
    return (["A", "B"] as const).some((t) =>
      match.players
        .filter((p) => match.teams.get(p.id) === t)
        .every((p) => match.left.has(p.id) || !room.members.get(p.id)?.connected),
    );
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
