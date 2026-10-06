import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ScoreMatch, type ScoreTeam } from "@/components/play/ScoreMatch";
import { MULTIPLAYER_CONFIG } from "@/config/app";
import { listOpponents, opponentSkill } from "@/services/game.service";
import { PhoneFrame } from "@/layouts/AppShell";
import { mePlayer } from "@/services/game.service";

export const Route = createFileRoute("/play/duel")({
  head: () => ({
    meta: [
      { title: "Duelo 1v1 — Língua STP" },
      { name: "description", content: "Duelo de 10 perguntas: pontos por acerto e velocidade." },
      { property: "og:title", content: "Duelo 1v1 — Língua STP" },
      { property: "og:description", content: "Quem responde melhor e mais rápido?" },
    ],
  }),
  component: Duel,
});

function Duel() {
  const [teams] = useState<[ScoreTeam, ScoreTeam]>(() => [
    { name: "Tu", tone: "forest", players: [mePlayer()] },
    { name: "Adversário", tone: "coral", players: [listOpponents()[0]!] },
  ]);
  const { questions, seconds } = MULTIPLAYER_CONFIG.duel;
  return <PhoneFrame className="bg-muted"><ScoreMatch teams={teams} questions={questions} seconds={seconds} replayTo="/play/duel" /></PhoneFrame>;
}
