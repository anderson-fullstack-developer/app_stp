import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Skull } from "lucide-react";
import { useState } from "react";
import { BackButton } from "@/components/app/BackButton";
import { Avatar } from "@/components/app/Badges";
import { AppButton } from "@/components/app/Buttons";
import { PhoneFrame } from "@/layouts/AppShell";
import type { AvatarColor } from "@/types";
import { APP_NAME } from "@stp/config";

export const Route = createFileRoute("/elimination")({
  // Legacy prototype screen, superseded by /play/survival. Kept (not deleted) but redirected so there is one flow.
  beforeLoad: () => {
    throw redirect({ to: "/play/survival", replace: true });
  },
  head: () => ({
    meta: [
      { title: `Modo Eliminação — ${APP_NAME}` },
      { name: "description", content: "Erra e és eliminado. O último a resistir ganha." },
      { property: "og:title", content: `Modo Eliminação — ${APP_NAME}` },
      { property: "og:description", content: "Sobrevive até à final." },
    ],
  }),
  component: Elimination,
});

const COLORS: AvatarColor[] = ["forest", "coral", "ocean", "cocoa", "sun"];
const PLAYERS = [
  "Anderson",
  "Maria",
  "João",
  "Carlos",
  "Ana",
  "Edson",
  "Inês",
  "Djamila",
  "Rui",
  "Telma",
];
const ROUNDS = [
  { q: 4, out: [7, 9] },
  { q: 5, out: [4, 6, 8] },
  { q: 6, out: [2, 5] },
  { q: 7, out: [3, 1] },
];

function Elimination() {
  const [round, setRound] = useState(0);
  const eliminated = ROUNDS.slice(0, round).flatMap((r) => r.out);
  const finished = round >= ROUNDS.length;
  const last = ROUNDS[round - 1];
  return (
    <PhoneFrame className="bg-cocoa text-secondary-foreground">
      <div className="flex items-center px-4 pt-3 safe-top">
        <BackButton close />
        <span className="flex-1 text-center font-display font-bold">💀 Eliminação</span>
        <span className="w-10" />
      </div>
      <main className="flex flex-1 flex-col items-center px-5 pt-6 text-center">
        {finished ? (
          <div className="animate-pop mt-10">
            <p className="text-6xl">🏆</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-accent">Final</p>
            <Avatar
              name="Anderson"
              color="forest"
              size={96}
              className="mx-auto mt-4 ring-4 ring-accent"
            />
            <h1 className="mt-3 font-display text-3xl font-bold">Anderson venceu!</h1>
          </div>
        ) : (
          <>
            <p className="font-display text-5xl font-bold">{PLAYERS.length - eliminated.length}</p>
            <p className="font-semibold opacity-80">jogadores restantes</p>
            <p className="mt-4 rounded-xl bg-secondary-foreground/10 px-4 py-1 font-display font-bold">
              Pergunta {ROUNDS[round]?.q}
            </p>
            {last && (
              <p className="animate-rise mt-3 inline-flex items-center gap-1.5 font-bold text-destructive">
                <Skull className="size-4" />
                {last.out.length} jogadores eliminados
              </p>
            )}
          </>
        )}
        <div className="mt-8 grid grid-cols-5 gap-3">
          {PLAYERS.map((n, i) => {
            const out = eliminated.includes(i);
            return (
              <div key={n} className="relative flex flex-col items-center">
                <Avatar name={n} color={COLORS[i % 5] ?? "forest"} size={52} dim={out} />
                {out && <Skull className="animate-pop absolute top-3 size-6 text-destructive" />}
                <span
                  className={
                    out
                      ? "mt-1 text-[10px] line-through opacity-50"
                      : "mt-1 text-[10px] font-semibold"
                  }
                >
                  {n}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-auto w-full pb-6 pt-6 safe-bottom">
          {finished ? (
            <Link to="/challenges">
              <AppButton variant="sun">Voltar aos desafios</AppButton>
            </Link>
          ) : (
            <AppButton variant="sun" onClick={() => setRound(round + 1)}>
              Ver resultado da ronda
            </AppButton>
          )}
        </div>
      </main>
    </PhoneFrame>
  );
}
