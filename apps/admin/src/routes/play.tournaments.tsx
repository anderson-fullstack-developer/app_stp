import { createFileRoute } from "@tanstack/react-router";
import { BackButton } from "@/components/app/BackButton";
import { SoonBadge } from "@/components/app/Badges";
import { AppButton } from "@/components/app/Buttons";
import { AppHeader, PhoneFrame } from "@/layouts/AppShell";
import { APP_NAME } from "@stp/config";

export const Route = createFileRoute("/play/tournaments")({
  head: () => ({
    meta: [
      { title: `Torneios — ${APP_NAME}` },
      {
        name: "description",
        content: "Torneios semanais com prémios em XP, moedas e badges. Em breve.",
      },
      { property: "og:title", content: `Torneios — ${APP_NAME}` },
      { property: "og:description", content: "Torneios chegam em breve." },
    ],
  }),
  component: Tournaments,
});

function Tournaments() {
  return (
    <PhoneFrame>
      <AppHeader left={<BackButton />} title="Torneios" />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-6">
        <div className="rounded-[2rem] bg-sun p-6 text-accent-foreground pattern-leaf">
          <div className="flex items-start justify-between">
            <span className="text-5xl">🏆</span>
            <SoonBadge />
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold">Torneio Semanal</h1>
          <p className="font-semibold opacity-85">128 jogadores · eliminatórias</p>
          <p className="mt-4 text-sm font-bold">Prémios</p>
          <div className="mt-2 flex gap-2">
            {["XP", "Moedas", "Badges"].map((p) => (
              <span key={p} className="rounded-xl bg-surface/70 px-3 py-1.5 text-sm font-bold">
                {p}
              </span>
            ))}
          </div>
        </div>
        <p className="text-center text-sm font-semibold text-muted-foreground">
          Competição justa: ninguém pode comprar vantagens.
        </p>
        <div className="mt-auto">
          <AppButton disabled>Em breve</AppButton>
        </div>
      </main>
    </PhoneFrame>
  );
}
