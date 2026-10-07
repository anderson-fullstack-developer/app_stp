import { useEffect, useRef } from "react";
import { scaleStep, sound } from "@/lib/sound";

/**
 * Toca um som sempre que entra um jogador (o tom sobe a cada entrada) e um acorde quando a
 * sala fica completa. Não toca para os jogadores que já estavam quando o ecrã abriu, nem para ti.
 */
export function useJoinSounds(count: number, full: boolean) {
  const prev = useRef(count);
  useEffect(() => {
    if (count > prev.current && prev.current > 0)
      sound.play("join", { pitch: scaleStep(count - 2) });
    prev.current = count;
  }, [count]);
  useEffect(() => {
    if (full) sound.play("roomFull");
  }, [full]);
}
