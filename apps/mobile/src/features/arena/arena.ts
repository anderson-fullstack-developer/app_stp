/**
 * Arena na app: liga o cliente partilhado (@stp/arena-client) ao Clerk Expo e ao React.
 * Em React Native usa só WebSocket (sem long-polling).
 */
import { useAuth } from "@clerk/expo";
import {
  type ArenaMatchState,
  type ArenaState,
  createArenaClient,
  INITIAL_ARENA_STATE,
} from "@stp/arena-client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { API_URL } from "@/config";
import { haptics, sound } from "@/design";

export { countdownValue, secondsLeft } from "@stp/arena-client";
export type { ArenaMatchState, ArenaState };

export const arena = createArenaClient({
  baseUrl: API_URL,
  getToken: async () => null,
  transports: ["websocket"],
});

/** Liga à Arena enquanto houver sessão; devolve o estado ao vivo. */
export function useArena(): ArenaState {
  const { getToken, isSignedIn } = useAuth();
  useEffect(() => {
    arena.setTokenGetter(() => getToken());
  }, [getToken]);
  useEffect(() => {
    if (isSignedIn) arena.connect();
  }, [isSignedIn]);
  return useSyncExternalStore(arena.subscribe, arena.getState, () => INITIAL_ARENA_STATE);
}

/** Relógio local (a cada 100 ms) para mostrar contagens até prazos do servidor. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Pontos ganhos por jogador na última ronda revelada; som e vibração da minha resposta. */
export function useRoundGains(m: ArenaMatchState, me: string | null): Record<string, number> {
  const previous = useRef<Record<string, number>>({});
  const [gains, setGains] = useState<Record<string, number>>({});
  useEffect(() => {
    if (m.phase !== "reveal") return;
    setGains(
      Object.fromEntries(
        m.players.map((p) => [p.userId, p.score - (previous.current[p.userId] ?? 0)]),
      ),
    );
    previous.current = Object.fromEntries(m.players.map((p) => [p.userId, p.score]));
    const mine = me ? m.reveal?.outcomes[me] : undefined;
    if (mine === "correct") {
      sound.play("correct");
      haptics.success();
    } else if (mine) {
      sound.play("wrong");
      haptics.error();
    }
  }, [m.phase, m.round]); // eslint-disable-line react-hooks/exhaustive-deps
  return gains;
}

/** Som de urgência nos últimos 3 segundos de cada pergunta. */
export function useUrgencySound(secondsLeftNow: number, phase: ArenaMatchState["phase"]) {
  const whole = Math.ceil(secondsLeftNow);
  useEffect(() => {
    if (phase === "question" && whole > 0 && whole <= 3) sound.play("urgent");
  }, [whole]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Mensagens dos códigos de erro do servidor da Arena. */
export const ARENA_ERRORS: Record<string, string> = {
  ROOM_NOT_FOUND: "Não existe nenhuma sala com esse código.",
  ROOM_FULL: "A sala está cheia.",
  ROOM_STARTED: "A partida já começou.",
  IN_MATCH: "Estás a meio de uma partida.",
  NOT_READY: "Ainda há jogadores que não estão prontos.",
  NOT_ENOUGH_PLAYERS: "São precisos pelo menos 2 jogadores.",
  NO_QUESTIONS: "Ainda não há perguntas suficientes nesta língua.",
  LANGUAGE_NOT_AVAILABLE: "Esta língua ainda não está disponível.",
  TEAM_FULL: "Essa equipa já tem 2 jogadores.",
  TEAMS_INCOMPLETE: "São precisas 2 pessoas em cada equipa.",
  NOT_FRIENDS: "Só podes convidar amigos.",
  ALREADY_IN_ROOM: "Já está na sala.",
  TOO_MANY_INVITES: "Já enviaste convites suficientes.",
  OFFLINE: "Sem ligação ao servidor da Arena.",
  TIMEOUT: "O servidor não respondeu.",
};
export const arenaError = (r: { code: string; message: string }) =>
  ARENA_ERRORS[r.code] ?? r.message;

export const REWARD_NOTE: Record<string, string> = {
  private_small: "As recompensas só contam em salas com 4 ou mais jogadores.",
  duel_limit: "Já fizeste os 3 duelos premiados de hoje — este foi só pela glória.",
  daily_limit: "Já chegaste às 10 partidas premiadas de hoje.",
  left: "Saíste a meio: sem recompensa.",
  error: "Não foi possível registar a recompensa. Tenta outra vez mais tarde.",
};
