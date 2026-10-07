import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Zap } from "lucide-react";
import { BackButton } from "@/components/app/BackButton";
import { AppButton } from "@/components/app/Buttons";
import { LeaderboardCard } from "@/components/app/Cards";
import { LoadingState, SectionTitle } from "@/components/app/Primitives";
import { useDaily, useRanking } from "@/hooks/use-service";
import { AppHeader, PhoneFrame } from "@/layouts/AppShell";
import { useGame } from "@/hooks/use-game";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/daily")({
  head: () => ({
    meta: [
      { title: "Desafio do Dia — Língua STP" },
      { name: "description", content: "5 perguntas por dia, recompensas e ranking diário." },
      { property: "og:title", content: "Desafio do Dia — Língua STP" },
      { property: "og:description", content: "Joga o desafio diário e sobe no ranking." },
    ],
  }),
  component: Daily,
});

function Daily() {
  const { data } = useDaily();
  const { data: rank } = useRanking("global");
  const g = useGame();
  return (
    <PhoneFrame>
      <AppHeader left={<BackButton />} title="Desafio do Dia" />
      <main className="flex-1 px-4 pb-8">
        {!data ? (
          <LoadingState />
        ) : (
          <div className="animate-rise overflow-hidden rounded-[2rem] bg-sun p-6 text-accent-foreground">
            <div className="grid size-16 place-items-center rounded-3xl bg-surface/50 animate-float">
              <Zap className="size-8 fill-current" />
            </div>
            <h1 className="mt-4 font-display text-3xl font-bold">Desafio do Dia</h1>
            <p className="font-semibold opacity-80">
              {data.questions} perguntas · {g.dailyDone ? "✓ Concluído" : "Completa hoje"}
            </p>
            <div className="mt-4 flex gap-2">
              <span className="rounded-xl bg-surface/60 px-3 py-1 font-bold">
                +{data.xpReward} XP
              </span>
              <span className="rounded-xl bg-surface/60 px-3 py-1 font-bold">
                +{data.coinReward} moedas
              </span>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-sm font-semibold">
              <Users className="size-4" />
              {data.participants} pessoas já participaram hoje.
            </p>
            {g.dailyDone ? (
              <div className="mt-5 flex h-14 items-center justify-center gap-2 rounded-2xl bg-surface/70 font-display font-bold text-success">
                <CheckCircle2 />
                Concluído — volta amanhã
              </div>
            ) : (
              <Link
                to="/lesson/$lessonId"
                params={{ lessonId: "l3" }}
                search={{ daily: true }}
                className="mt-5 block"
              >
                <AppButton>Jogar</AppButton>
              </Link>
            )}
          </div>
        )}
        <SectionTitle>Ranking diário</SectionTitle>
        <div className="space-y-2">
          {rank?.slice(0, 5).map((e) => (
            <LeaderboardCard key={e.userId} entry={e} />
          ))}
        </div>
      </main>
    </PhoneFrame>
  );
}
