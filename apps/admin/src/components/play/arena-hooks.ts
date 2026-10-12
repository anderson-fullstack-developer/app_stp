/** Hooks de apresentação partilhados pelos ecrãs da Arena com pontos (duelo e 2 contra 2). */
import { useEffect, useRef, useState } from "react";
import type { ArenaMatchState } from "@/lib/multiplayer/arena-client";
import { sound } from "@/lib/sound";

/** Relógio local (atualiza a cada 100 ms) para mostrar contagens até prazos do servidor. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Segundos até ao fim da pergunta (0 fora da fase de pergunta). */
export function secondsLeft(m: ArenaMatchState, now: number): number {
  return m.phase === "question" && m.deadlineAt ? Math.max(0, (m.deadlineAt - now) / 1000) : 0;
}

/** Contagem antes da 1.ª pergunta: 3, 2, 1, "go" (null fora da contagem). */
export function countdownValue(m: ArenaMatchState, now: number): number | "go" | null {
  if (m.phase !== "countdown" || !m.countdownAt) return null;
  const left = m.countdownAt - now;
  return left > 0 ? Math.min(3, Math.ceil(left / 1000)) : "go";
}

/**
 * Pontos ganhos por cada jogador na última ronda revelada (diferença para a anterior),
 * e o som certo/errado da minha resposta.
 */
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
    if (mine) sound.play(mine === "correct" ? "correct" : "wrong");
  }, [m.phase, m.round]); // eslint-disable-line react-hooks/exhaustive-deps
  return gains;
}

/** Som de urgência nos últimos 3 segundos de cada pergunta. */
export function useUrgencySound(m: ArenaMatchState, now: number) {
  const whole = Math.ceil(secondsLeft(m, now));
  useEffect(() => {
    if (m.phase === "question" && whole > 0 && whole <= 3) sound.play("urgent");
  }, [whole]); // eslint-disable-line react-hooks/exhaustive-deps
}
