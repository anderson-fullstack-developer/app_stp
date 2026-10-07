import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AdSlot } from "@/components/app/Ads";
import { Avatar } from "@/components/app/Badges";
import { AppButton } from "@/components/app/Buttons";
import { EmptyState } from "@/components/app/Primitives";
import { GameResultStats, Podium, RewardRow } from "@/components/play/ResultUI";
import { PhoneFrame } from "@/layouts/AppShell";
import { session } from "@/lib/multiplayer/session-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/play/results")({
  head: () => ({
    meta: [
      { title: "Resultados — Língua STP" },
      { name: "description", content: "Classificação final da partida, XP e moedas ganhas." },
      { property: "og:title", content: "Resultados — Língua STP" },
      { property: "og:description", content: "Vê o pódio da partida." },
    ],
  }),
  component: Results,
});

function Results() {
  const [r] = useState(() => session.getResult());
  if (!r) {
    return (
      <PhoneFrame>
        <main className="flex flex-1 flex-col justify-center gap-4 px-5">
          <EmptyState
            title="Sem resultados"
            text="Joga uma partida para ver aqui a classificação."
          />
          <Link to="/challenges">
            <AppButton>Ir jogar</AppButton>
          </Link>
        </main>
      </PhoneFrame>
    );
  }
  return (
    <PhoneFrame>
      <main className="flex flex-1 flex-col gap-5 px-5 pt-6 pb-8 safe-top">
        <h1 className="text-center font-display text-sm font-bold text-muted-foreground">
          Resultados
        </h1>
        <Podium top={r.standings.slice(0, 3)} />
        <ul className="space-y-1.5">
          {r.standings.slice(3).map((s) => (
            <li
              key={s.id}
              className={cn(
                "flex items-center gap-3 rounded-2xl bg-surface px-3 py-2",
                s.isMe && "ring-2 ring-primary",
              )}
            >
              <span className="w-6 text-center font-display font-bold text-muted-foreground">
                {s.place}
              </span>
              <Avatar name={s.name} color={s.color} size={32} />
              <span className="flex-1 font-bold">
                {s.name}
                {s.isMe && " (tu)"}
              </span>
              <span className="text-sm font-semibold text-muted-foreground">{s.detail}</span>
            </li>
          ))}
        </ul>
        <div className="rounded-[1.75rem] bg-forest p-5 text-center text-primary-foreground">
          <p className="font-display text-3xl font-bold">
            {r.myPlace === 1 ? "Venceste! 🏆" : `Ficaste em ${r.myPlace}.º!`}
          </p>
          <div className="mt-3">
            <RewardRow reward={r.reward} />
          </div>
        </div>
        <GameResultStats
          items={[
            ["Perguntas", r.stats.questions],
            ["Corretas", r.stats.correct],
            ["Erradas", r.stats.wrong + r.stats.timeouts],
            ["Precisão", `${r.stats.accuracy}%`],
          ]}
        />
        <div className="space-y-3">
          <Link to="/play/survival">
            <AppButton>Jogar novamente</AppButton>
          </Link>
          <Link to="/challenges">
            <AppButton variant="secondary">Menu</AppButton>
          </Link>
        </div>
        <AdSlot placement="result" />
      </main>
    </PhoneFrame>
  );
}
