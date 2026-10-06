import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { AdSlot } from "@/components/app/Ads";
import { GameModeCard } from "@/components/play/LobbyUI";
import { isEnabled, MULTIPLAYER_CONFIG } from "@stp/config";
import { AppHeader, TabLayout } from "@/layouts/AppShell";
import { session } from "@/lib/multiplayer/session-store";

export const Route = createFileRoute("/challenges")({
  head: () => ({
    meta: [
      { title: "Jogar — Língua STP" },
      { name: "description", content: "Sobrevivência online, duelos 1v1, 2v2, salas privadas e torneios." },
      { property: "og:title", content: "Jogar — Língua STP" },
      { property: "og:description", content: "Compete com amigos e jogadores de todo o mundo." },
    ],
  }),
  component: Play,
});

function Play() {
  useEffect(() => { session.setPending(null); }, []);
  const s = MULTIPLAYER_CONFIG.publicSurvival;
  const [first, second, third] = MULTIPLAYER_CONFIG.survivalRewards;
  return (
    <TabLayout header={<AppHeader title="Jogar" />}>
      <div className="space-y-3">
        <Link to="/play/survival" className="block">
          <GameModeCard featured emoji="💀" title="Sobrevivência Online" text={`${s.players} jogadores · ${s.lives} vidas · ${s.seconds}s por pergunta. O último sobrevivente vence.`} bg="bg-cocoa text-secondary-foreground" cta="Procurar partida">
            <div className="mt-3 flex gap-2 text-xs font-bold">
              {[["🥇", first], ["🥈", second], ["🥉", third]].map(([m, r]) => typeof r === "object" && (
                <span key={String(m)} className="rounded-xl bg-secondary-foreground/15 px-2 py-1">{String(m)} +{r.xp} XP · +{r.coins} 🪙</span>
              ))}
            </div>
          </GameModeCard>
        </Link>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/daily"><GameModeCard emoji="🎯" title="Desafio Diário" text="Mantém a sequência" bg="bg-sun text-accent-foreground" /></Link>
          <Link to="/play/duel"><GameModeCard emoji="⚔️" title="1 vs 1" text="Acerto + velocidade" bg="bg-coral text-destructive-foreground" /></Link>
          <Link to="/play/teams"><GameModeCard emoji="👥" title="2 vs 2" text="Joga em equipa" bg="bg-forest text-primary-foreground" /></Link>
          <Link to="/play/private"><GameModeCard emoji="🔐" title="Sala Privada" text="Cria ou entra com código" bg="bg-ocean-grad text-ocean-foreground" /></Link>
        </div>
        <Link to="/play/tournaments" className="block">
          <GameModeCard emoji="🏆" title="Torneios" text="Torneio semanal · 128 jogadores" bg="bg-surface text-foreground border-2 border-border" soon={!isEnabled("tournamentsEnabled")} />
        </Link>
        <p className="px-2 text-center text-xs font-semibold text-muted-foreground">Competição justa: o Premium não dá vidas nem vantagens nas partidas.</p>
        <AdSlot placement="home" />
      </div>
    </TabLayout>
  );
}
