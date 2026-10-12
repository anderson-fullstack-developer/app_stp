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
import { Alert, BackHandler } from "react-native";
import { API_URL } from "@/config";
import { haptics, sound } from "@/design";
import { exists as i18nExists, t as i18nT } from "i18next";

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

/** Mensagem traduzida para um código de erro do servidor da Arena. */
export function arenaError(r: { code: string; message: string }): string {
  const key = `arena.errors.${r.code}`;
  return i18nExists(key) ? i18nT(key as never) : r.message || i18nT("arena.errors.generic");
}

/** Porque não houve recompensa (sala pequena, limites diários, saiu a meio, erro). */
export function rewardNote(reason: string): string | undefined {
  const key = `arena.rewardNote.${reason}`;
  return i18nExists(key) ? i18nT(key as never) : undefined;
}

/**
 * Botão "voltar" do Android a meio de uma partida: pergunta antes de sair. Se a pessoa
 * confirmar, sai a sério (o servidor aplica as regras de abandono) e volta a Jogar.
 */
export function useConfirmLeaveOnBack(active: boolean, onLeave: () => void) {
  useEffect(() => {
    if (!active) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      Alert.alert(i18nT("arena.leaveMatchTitle"), i18nT("arena.leaveMatchText"), [
        { text: i18nT("arena.keepPlaying"), style: "cancel" },
        { text: i18nT("arena.leave"), style: "destructive", onPress: onLeave },
      ]);
      return true; // não fecha o ecrã sozinho
    });
    return () => sub.remove();
  }, [active, onLeave]);
}
