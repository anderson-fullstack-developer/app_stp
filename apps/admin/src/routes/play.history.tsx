import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ArenaHistoryDto } from "@stp/types/api";
import { Coins, Trophy, Zap } from "lucide-react";
import { BackButton } from "@/components/app/BackButton";
import { AppButton } from "@/components/app/Buttons";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/Primitives";
import { useServerLessonsEnabled } from "@/hooks/use-server-lessons";
import { AppHeader, PhoneFrame } from "@/layouts/AppShell";
import { cn } from "@/lib/utils";
import { http } from "@/services/http";
import { APP_NAME } from "@stp/config";

export const Route = createFileRoute("/play/history")({
  head: () => ({
    meta: [
      { title: `Histórico de partidas — ${APP_NAME}` },
      { name: "description", content: "As tuas últimas partidas da Arena." },
    ],
  }),
  component: History,
});

/** As minhas últimas partidas da Arena (registo do servidor). */
function History() {
  const server = useServerLessonsEnabled();
  const matches = useQuery({
    queryKey: ["arena", "history"],
    queryFn: () => http.get<ArenaHistoryDto[]>("arena", "matches"),
    enabled: server,
  });
  return (
    <PhoneFrame>
      <AppHeader left={<BackButton />} title="Histórico de partidas" />
      <main className="flex-1 space-y-2 px-4 pb-8">
        {!server ? (
          <EmptyState
            title="Entra na tua conta"
            text="O histórico guarda as partidas jogadas com sessão iniciada."
          />
        ) : matches.isPending ? (
          <LoadingState />
        ) : !matches.data ? (
          <ErrorState onRetry={() => void matches.refetch()} />
        ) : matches.data.length === 0 ? (
          <>
            <EmptyState
              title="Ainda não jogaste na Arena"
              text="Cria uma sala privada e desafia os teus amigos."
            />
            <Link to="/play/private" className="block">
              <AppButton>Criar sala</AppButton>
            </Link>
          </>
        ) : (
          matches.data.map((m) => <MatchRow key={m.matchId} m={m} />)
        )}
      </main>
    </PhoneFrame>
  );
}

function MatchRow({ m }: { m: ArenaHistoryDto }) {
  const won = m.place === 1 && !m.left;
  const date = new Date(m.finishedAt).toLocaleString("pt-PT", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div
      className={cn(
        "animate-rise card flex items-center gap-3 rounded-2xl p-3.5",
        won && "ring-2 ring-accent",
      )}
    >
      <span
        className={cn(
          "grid size-12 shrink-0 place-items-center rounded-2xl font-display text-lg font-bold",
          won ? "bg-sun" : "bg-muted",
        )}
      >
        {won ? <Trophy className="size-6" /> : m.left ? "—" : `${m.place}.º`}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold leading-tight">
          {m.left ? "Saíste a meio" : won ? "Vitória!" : `${m.place}.º lugar`}{" "}
          <span className="font-semibold text-muted-foreground">de {m.players}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          💀 Sobrevivência · {m.correct} certas · {m.rounds} rondas · {date}
        </p>
      </div>
      <div className="text-right text-xs font-bold">
        {m.xp > 0 ? (
          <>
            <p className="inline-flex items-center gap-1 text-primary">
              <Zap className="size-3.5" />+{m.xp}
            </p>
            <p className="inline-flex items-center gap-1 text-secondary">
              <Coins className="size-3.5" />+{m.coins}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">{m.rewarded ? "—" : "sem prémio"}</p>
        )}
      </div>
    </div>
  );
}
