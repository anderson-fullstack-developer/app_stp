import { createFileRoute } from "@tanstack/react-router";
import { Shuffle } from "lucide-react";
import { useState } from "react";
import { BackButton } from "@/components/app/BackButton";
import { AppButton } from "@/components/app/Buttons";
import { TeamCard } from "@/components/play/LobbyUI";
import { ScoreMatch, type ScoreTeam } from "@/components/play/ScoreMatch";
import { MULTIPLAYER_CONFIG } from "@stp/config";
import { listOpponents, opponentSkill } from "@/services/game.service";
import { AppHeader, PhoneFrame } from "@/layouts/AppShell";
import { session } from "@/lib/multiplayer/session-store";
import { mePlayer } from "@/services/game.service";
import type { MatchPlayerSeed } from "@stp/types/multiplayer";

export const Route = createFileRoute("/play/teams")({
  head: () => ({
    meta: [
      { title: "2 vs 2 — Língua STP" },
      { name: "description", content: "Joga em equipa: cada resposta certa soma pontos para a tua equipa." },
      { property: "og:title", content: "2 vs 2 — Língua STP" },
      { property: "og:description", content: "Equipa A contra Equipa B." },
    ],
  }),
  component: Teams,
});

function initialRoster(): MatchPlayerSeed[] {
  const pending = session.peekPending();
  if (pending && pending.members.length >= 4) {
    return pending.members.slice(0, 4).map((mb) => ({ id: mb.id, name: mb.name, color: mb.color, isMe: mb.isMe }));
  }
  // [A1, A2, B1, B2]
  return [mePlayer(), listOpponents()[1]!, listOpponents()[0]!, listOpponents()[2]!];
}

function Teams() {
  const [roster, setRoster] = useState<MatchPlayerSeed[]>(initialRoster);
  const [started, setStarted] = useState(false);
  const teams: [ScoreTeam, ScoreTeam] = [
    { name: "Equipa A", tone: "forest", players: roster.slice(0, 2) },
    { name: "Equipa B", tone: "coral", players: roster.slice(2, 4) },
  ];
  const meIdx = roster.findIndex((p) => p.isMe);
  const switchTeam = () => {
    const r = [...roster];
    const target = meIdx < 2 ? 2 : 0;
    [r[meIdx], r[target]] = [r[target]!, r[meIdx]!];
    setRoster(r);
  };
  const randomize = () => setRoster([...roster].sort(() => Math.random() - 0.5));

  if (started) {
    const { questions, seconds } = MULTIPLAYER_CONFIG.teams;
    return <PhoneFrame className="bg-muted"><ScoreMatch teams={teams} questions={questions} seconds={seconds} replayTo="/play/teams" /></PhoneFrame>;
  }

  return (
    <PhoneFrame>
      <AppHeader left={<BackButton />} title="2 vs 2" />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-6">
        <TeamCard name="Equipa A" tone="forest" players={teams[0].players} />
        <p className="text-center font-display text-2xl font-bold">VS</p>
        <TeamCard name="Equipa B" tone="coral" players={teams[1].players} />
        <p className="text-center text-sm font-semibold text-muted-foreground">Todos respondem individualmente. Cada resposta certa soma pontos para a equipa.</p>
        <div className="grid grid-cols-2 gap-2">
          <AppButton variant="secondary" size="md" onClick={switchTeam}>Trocar equipa</AppButton>
          <AppButton variant="secondary" size="md" onClick={randomize}><Shuffle className="size-4" />Aleatórias</AppButton>
        </div>
        <div className="mt-auto"><AppButton onClick={() => setStarted(true)}>Começar partida</AppButton></div>
      </main>
    </PhoneFrame>
  );
}
