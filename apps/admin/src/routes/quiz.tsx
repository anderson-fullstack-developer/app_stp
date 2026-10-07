import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { BackButton } from "@/components/app/BackButton";
import { Avatar } from "@/components/app/Badges";
import { AppButton } from "@/components/app/Buttons";
import { SectionTitle } from "@/components/app/Primitives";
import { QuizOption } from "@/components/exercises/Exercises";
import { useRoom } from "@/hooks/use-service";
import { PhoneFrame } from "@/layouts/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/quiz")({
  // Legacy prototype screen, superseded by /play/survival. Kept (not deleted) but redirected so there is one flow.
  beforeLoad: () => {
    throw redirect({ to: "/play/survival", replace: true });
  },
  head: () => ({
    meta: [
      { title: "Quiz multijogador — Língua STP" },
      { name: "description", content: "Responde depressa e vê o ranking ao vivo." },
      { property: "og:title", content: "Quiz multijogador — Língua STP" },
      { property: "og:description", content: "Quiz em tempo real com amigos." },
    ],
  }),
  component: Quiz,
});

function Quiz() {
  const { data: room } = useRoom();
  const [time, setTime] = useState(10);
  const [sel, setSel] = useState<number | null>(null);
  const done = sel !== null || time === 0;
  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setTime((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [time, done]);
  const ranking = [...(room?.players ?? [])].sort((a, b) => b.score - a.score);

  return (
    <PhoneFrame className="bg-primary-deep text-primary-foreground">
      <div className="flex items-center justify-between px-4 pt-3 safe-top">
        <BackButton close />
        <span className="font-display font-bold">Pergunta 4/10</span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-xl px-3 py-1 font-display text-lg font-bold",
            time <= 3 ? "bg-destructive" : "bg-primary-foreground/15",
          )}
        >
          <Timer className="size-5" />
          {String(time).padStart(2, "0")}
        </span>
      </div>
      <main className="flex-1 px-5 pb-8 pt-6">
        <div className="rounded-3xl bg-surface p-5 text-foreground">
          <p className="text-xs font-bold uppercase text-muted-foreground">O que significa?</p>
          <p className="font-display text-2xl font-bold">Palavra em Forro</p>
        </div>
        <div className="mt-4 space-y-3 text-foreground">
          {["A", "B", "C", "D"].map((l, i) => (
            <QuizOption
              key={l}
              letter={l}
              label={`Resposta ${l}`}
              selected={sel === i}
              state={!done ? "idle" : i === 1 ? "correct" : sel === i ? "wrong" : "idle"}
              onClick={() => !done && setSel(i)}
            />
          ))}
        </div>
        {done && (
          <div className="animate-rise">
            <SectionTitle>Ranking ao vivo</SectionTitle>
            <ol className="space-y-2">
              {ranking.map((p, i) => (
                <li
                  key={p.id}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-2",
                    p.isHost ? "bg-accent text-accent-foreground" : "bg-primary-foreground/10",
                  )}
                >
                  <span className="w-5 font-display font-bold">{i + 1}</span>
                  <Avatar name={p.name} color={p.avatarColor} size={34} />
                  <span className="flex-1 font-semibold">{p.name}</span>
                  <span className="font-display font-bold">{p.score}</span>
                </li>
              ))}
            </ol>
            <Link to="/challenges" className="mt-5 block">
              <AppButton variant="sun">Próxima pergunta</AppButton>
            </Link>
          </div>
        )}
      </main>
    </PhoneFrame>
  );
}
