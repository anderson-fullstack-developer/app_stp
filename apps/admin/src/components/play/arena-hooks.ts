/** Hooks de apresentação partilhados pelos ecrãs da Arena com pontos (duelo e 2 contra 2). */
import { useEffect, useRef, useState } from "react";
import { secondsLeft } from "@stp/arena-client";
import type { ArenaMatchState } from "@/lib/multiplayer/arena-client";

import { sound } from "@/lib/sound";

export { countdownValue, secondsLeft } from "@stp/arena-client";

/** Relógio local (atualiza a cada 100 ms) para mostrar contagens até prazos do servidor. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);
  return now;
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
