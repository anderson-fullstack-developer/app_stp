import { createFileRoute } from "@tanstack/react-router";
import { ServerDuel } from "@/components/play/ServerDuel";
import { useServerLessonsEnabled } from "@/hooks/use-server-lessons";
import { useState } from "react";
import { ScoreMatch, type ScoreTeam } from "@/components/play/ScoreMatch";
import { MULTIPLAYER_CONFIG, APP_NAME } from "@stp/config";
import { listOpponents, opponentSkill } from "@/services/game.service";
import { PhoneFrame } from "@/layouts/AppShell";
import { mePlayer } from "@/services/game.service";

export const Route = createFileRoute("/play/duel")({
  validateSearch: (s: Record<string, unknown>): { friend?: string } =>
    typeof s["friend"] === "string" ? { friend: s["friend"] } : {},
  head: () => ({
    meta: [
      { title: `Duelo 1v1 — ${APP_NAME}` },
      { name: "description", content: "Duelo de 10 perguntas: pontos por acerto e velocidade." },
      { property: "og:title", content: `Duelo 1v1 — ${APP_NAME}` },
      { property: "og:description", content: "Quem responde melhor e mais rápido?" },
    ],
  }),
  component: Duel,
});

/** Com sessão, duelo real contra um amigo; sem sessão, a demonstração com bot. */
function Duel() {
  const server = useServerLessonsEnabled();
  const { friend } = Route.useSearch();
  return server ? <ServerDuel friend={friend} /> : <DemoDuel />;
}

function DemoDuel() {
  const [teams] = useState<[ScoreTeam, ScoreTeam]>(() => [
    { name: "Tu", tone: "forest", players: [mePlayer()] },
    { name: "Adversário", tone: "coral", players: [listOpponents()[0]!] },
  ]);
  const { questions, seconds } = MULTIPLAYER_CONFIG.duel;
  return (
    <PhoneFrame className="bg-muted">
      <ScoreMatch teams={teams} questions={questions} seconds={seconds} replayTo="/play/duel" />
    </PhoneFrame>
  );
}
