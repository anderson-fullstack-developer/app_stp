/**
 * Cliente da Arena em tempo real (Socket.IO /arena). Guarda o que o servidor envia num
 * store simples; os ecrãs só leem este estado e enviam intenções. Nunca decide nada:
 * resposta certa, vidas, tempo oficial e vencedor vêm sempre do servidor.
 */
import { useAuth } from "@clerk/tanstack-react-start";
import type {
  ArenaAck,
  ArenaAnswerAck,
  ArenaConfigDto,
  ArenaCountdownEvent,
  ArenaFinishedEvent,
  ArenaInviteEvent,
  ArenaMatchDto,
  ArenaPlayerDto,
  ArenaQuestionDto,
  ArenaQuestionEvent,
  ArenaRevealEvent,
  ArenaRewardEvent,
  ArenaRoomDto,
} from "@stp/types/arena";
import { useEffect, useSyncExternalStore } from "react";
import { io, type Socket } from "socket.io-client";
import { API_BASE_URL, SOCKET_URL } from "@/config/api";

export interface ArenaMatchState {
  matchId: string;
  phase: ArenaMatchDto["phase"];
  round: number;
  /** Prazo oficial já convertido para o relógio deste dispositivo. */
  deadlineAt: number | null;
  countdownAt: number | null;
  question: ArenaQuestionDto | null;
  players: ArenaPlayerDto[];
  answeredCount: number;
  /** A minha escolha nesta ronda (só para mostrar; o servidor decide se conta). */
  selected: string | null;
  reveal: ArenaRevealEvent | null;
  finalIds: string[] | null;
}

export interface ArenaState {
  status: "idle" | "connecting" | "ready" | "offline" | "unauthorized";
  me: string | null;
  room: ArenaRoomDto | null;
  closed: boolean;
  match: ArenaMatchState | null;
  finished: ArenaFinishedEvent | null;
  reward: ArenaRewardEvent | null;
  /** Convite recebido agora (mostrado como aviso). */
  invite: ArenaInviteEvent | null;
}

const initial: ArenaState = {
  status: "idle",
  me: null,
  room: null,
  closed: false,
  match: null,
  finished: null,
  reward: null,
  invite: null,
};

let state: ArenaState = initial;
const listeners = new Set<() => void>();
const set = (patch: Partial<ArenaState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const setMatch = (patch: Partial<ArenaMatchState>) => {
  if (state.match) set({ match: { ...state.match, ...patch } });
};

let socket: Socket | null = null;
let tokenGetter: () => Promise<string | null> = async () => null;
/** Diferença entre o relógio do servidor e o deste dispositivo (ms). */
let offset = 0;
const local = (serverMs: number) => serverMs - offset;

function emptyMatch(matchId: string): ArenaMatchState {
  return {
    matchId,
    phase: "countdown",
    round: 0,
    deadlineAt: null,
    countdownAt: null,
    question: null,
    players: [],
    answeredCount: 0,
    selected: null,
    reveal: null,
    finalIds: null,
  };
}

function connect() {
  if (socket) return;
  set({ status: "connecting" });
  const base = (SOCKET_URL || API_BASE_URL).replace(/\/+$/, "");
  socket = io(`${base}/arena`, {
    // O token é pedido de novo a cada (re)ligação: o do Clerk expira depressa.
    auth: (cb) => {
      void tokenGetter().then((token) => cb({ token }));
    },
    transports: ["websocket", "polling"],
  });
  socket.on("arena:ready", (p: { userId: string; inRoom: boolean }) => {
    set({ status: "ready", me: p.userId });
    if (p.inRoom) void resync();
  });
  socket.on("arena:error", (p: { code: string }) => {
    if (p.code === "UNAUTHORIZED") set({ status: "unauthorized" });
  });
  socket.on("disconnect", () => {
    if (state.status !== "unauthorized") set({ status: "offline" });
  });
  socket.on("room:state", (room: ArenaRoomDto) => set({ room, closed: false }));
  socket.on("room:closed", () => set({ room: null, closed: true, match: null }));
  socket.on("match:countdown", (p: ArenaCountdownEvent) => {
    offset = p.serverNow - Date.now();
    set({
      finished: null,
      reward: null,
      match: { ...emptyMatch(p.matchId), countdownAt: local(p.startsAt) },
    });
  });
  socket.on("match:question", (p: ArenaQuestionEvent) => {
    offset = p.serverNow - Date.now();
    const base = state.match ?? emptyMatch(p.matchId);
    set({
      match: {
        ...base,
        phase: "question",
        round: p.round,
        question: p.question,
        deadlineAt: local(p.deadlineAt),
        answeredCount: 0,
        selected: null,
        reveal: null,
      },
    });
  });
  socket.on("match:answered", (p: { round: number; count: number }) => {
    if (state.match?.round === p.round) setMatch({ answeredCount: p.count });
  });
  socket.on("match:reveal", (p: ArenaRevealEvent) =>
    setMatch({ phase: "reveal", reveal: p, players: p.players, deadlineAt: null }),
  );
  socket.on("match:final", (p: { userIds: string[] }) =>
    setMatch({ phase: "final", finalIds: p.userIds }),
  );
  socket.on("match:finished", (p: ArenaFinishedEvent) => {
    set({ finished: p });
    setMatch({ phase: "finished" });
  });
  socket.on("match:reward", (p: ArenaRewardEvent) => set({ reward: p }));
  socket.on("arena:invite", (p: ArenaInviteEvent) => set({ invite: p }));
}

function ack<T extends object>(event: string, body?: unknown): Promise<ArenaAck<T>> {
  if (!socket || state.status !== "ready") {
    return Promise.resolve({
      ok: false,
      code: "OFFLINE",
      message: "Sem ligação ao servidor da Arena.",
    });
  }
  return socket
    .timeout(8_000)
    .emitWithAck(event, body ?? {})
    .catch(() => ({ ok: false, code: "TIMEOUT", message: "O servidor não respondeu." }));
}

async function resync() {
  const r = await ack<{
    state: { room: ArenaRoomDto; match: ArenaMatchDto | null } | null;
  }>("room:resync");
  if (!r.ok || !r.state) return;
  const m = r.state.match;
  set({
    room: r.state.room,
    match: m
      ? {
          ...emptyMatch(m.matchId),
          phase: m.phase,
          round: m.round,
          question: m.question,
          deadlineAt: m.deadlineAt ? local(m.deadlineAt) : null,
          players: m.players,
          answeredCount: m.answeredCount,
        }
      : null,
  });
}

export const arena = {
  async create(config: ArenaConfigDto, mode: "survival" | "teams" = "survival") {
    const r = await ack<{ room: ArenaRoomDto }>("room:create", { config, mode });
    if (r.ok) set({ room: r.room, closed: false, finished: null, reward: null, match: null });
    return r;
  },
  async join(code: string) {
    const r = await ack<{ room: ArenaRoomDto }>("room:join", { code });
    if (r.ok) set({ room: r.room, closed: false, finished: null, reward: null });
    return r;
  },
  async leave() {
    await ack("room:leave");
    set({ room: null, match: null, finished: null, reward: null });
  },
  ready: (ready: boolean) => ack<{ room: ArenaRoomDto }>("room:ready", { ready }),
  /** 2 contra 2: trocar de equipa na sala de espera. */
  async setTeam(team: "A" | "B") {
    const r = await ack<{ room: ArenaRoomDto }>("room:team", { team });
    if (r.ok) set({ room: r.room });
    return r;
  },
  start: () => ack("room:start"),
  invite: (userId: string) => ack("room:invite", { userId }),
  /** Desafiar um amigo para um duelo (cria a sala de 2 e envia-lhe o convite). */
  async challenge(userId: string) {
    const r = await ack<{ room: ArenaRoomDto }>("duel:challenge", { userId });
    if (r.ok) set({ room: r.room, closed: false, finished: null, reward: null, match: null });
    return r;
  },
  dismissInvite: () => set({ invite: null }),
  async answer(optionId: string): Promise<ArenaAnswerAck> {
    const m = state.match;
    if (!socket || !m?.question || m.selected) return { accepted: false, reason: "duplicate" };
    setMatch({ selected: optionId });
    try {
      return (await socket.timeout(5_000).emitWithAck("match:answer", {
        questionId: m.question.questionId,
        optionId,
      })) as ArenaAnswerAck;
    } catch {
      return { accepted: false, reason: "late" };
    }
  },
  /** Limpa o resultado depois de o mostrar. */
  clearResult: () => set({ finished: null, reward: null, match: null }),
  get: () => state,
};

/** Liga à Arena enquanto houver sessão; devolve o estado ao vivo. */
export function useArena(enabled: boolean): ArenaState {
  const { getToken, isSignedIn } = useAuth();
  useEffect(() => {
    tokenGetter = () => getToken();
  }, [getToken]);
  useEffect(() => {
    if (enabled && isSignedIn) connect();
  }, [enabled, isSignedIn]);
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => initial,
  );
}
