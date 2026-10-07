import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Coins, HeartPulse, KeyRound, Swords, Target, Trophy, Users } from "lucide-react";
import { AdSlot } from "@/components/app/Ads";
import { GameModeCard } from "@/components/play/LobbyUI";
import { isEnabled, MULTIPLAYER_CONFIG, APP_NAME } from "@stp/config";
import { AppHeader, TabLayout } from "@/layouts/AppShell";
import { session } from "@/lib/multiplayer/session-store";

export const Route = createFileRoute("/challenges")({
  head: () => ({
    meta: [
      { title: `Jogar — ${APP_NAME}` },
      {
        name: "description",
        content: "Sobrevivência online, duelos 1v1, 2v2, salas privadas e torneios.",
      },
      { property: "og:title", content: `Jogar — ${APP_NAME}` },
      { property: "og:description", content: "Compete com amigos e jogadores de todo o mundo." },
    ],
  }),
  component: Play,
});

function Play() {
  useEffect(() => {
    session.setPending(null);
  }, []);
  const s = MULTIPLAYER_CONFIG.publicSurvival;
  const [first, second, third] = MULTIPLAYER_CONFIG.survivalRewards;
  return (
    <TabLayout header={<AppHeader title="Jogar" />}>
      <div className="space-y-3">
        <Link to="/play/survival" className="block">
          <GameModeCard
            featured
            icon={HeartPulse}
            title="Sobrevivência Online"
            text={`${s.players} jogadores · ${s.lives} vidas · ${s.seconds}s por pergunta. O último sobrevivente vence.`}
            bg="bg-cocoa text-secondary-foreground"
            cta="Procurar partida"
          >
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              {[
                ["1.º", first],
                ["2.º", second],
                ["3.º", third],
              ].map(
                ([m, r]) =>
                  typeof r === "object" && (
                    <span
                      key={String(m)}
                      className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 ring-1 ring-inset ring-white/15"
                    >
                      <span className="opacity-70">{String(m)}</span> +{r.xp} XP · +{r.coins}
                      <Coins className="size-3.5" />
                    </span>
                  ),
              )}
            </div>
          </GameModeCard>
        </Link>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/daily">
            <GameModeCard
              icon={Target}
              title="Desafio Diário"
              text="Mantém a sequência"
              bg="bg-sun text-accent-foreground"
            />
          </Link>
          <Link to="/play/duel">
            <GameModeCard
              icon={Swords}
              title="1 vs 1"
              text="Acerto + velocidade"
              bg="bg-coral text-destructive-foreground"
            />
          </Link>
          <Link to="/play/teams">
            <GameModeCard
              icon={Users}
              title="2 vs 2"
              text="Joga em equipa"
              bg="bg-forest text-primary-foreground"
            />
          </Link>
          <Link to="/play/private">
            <GameModeCard
              icon={KeyRound}
              title="Sala Privada"
              text="Cria ou entra com código"
              bg="bg-ocean-grad text-ocean-foreground"
            />
          </Link>
        </div>
        <Link to="/play/tournaments" className="block">
          <GameModeCard
            icon={Trophy}
            plain
            title="Torneios"
            text="Torneio semanal · 128 jogadores"
            bg="text-foreground"
            soon={!isEnabled("tournamentsEnabled")}
          />
        </Link>
        <p className="px-2 text-center text-xs font-semibold text-muted-foreground">
          Competição justa: o Premium não dá vidas nem vantagens nas partidas.
        </p>
        <AdSlot placement="home" />
      </div>
    </TabLayout>
  );
}
