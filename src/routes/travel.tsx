import { createFileRoute } from "@tanstack/react-router";
import { Lock, Plane } from "lucide-react";
import { BackButton } from "@/components/app/BackButton";
import { SoonBadge } from "@/components/app/Badges";
import { AppButton } from "@/components/app/Buttons";
import { LoadingState } from "@/components/app/Primitives";
import { isEnabled } from "@/config/app";
import { useTravel } from "@/hooks/use-service";
import { AppHeader, PhoneFrame } from "@/layouts/AppShell";

export const Route = createFileRoute("/travel")({
  head: () => ({
    meta: [
      { title: "Pack Viagem STP — Língua STP" },
      { name: "description", content: "Expressões essenciais para visitar São Tomé e Príncipe. Em breve." },
      { property: "og:title", content: "Pack Viagem STP — Língua STP" },
      { property: "og:description", content: "Prepara a tua viagem a São Tomé e Príncipe." },
    ],
  }),
  component: Travel,
});

function Travel() {
  const { data } = useTravel();
  const on = isEnabled("travelPackEnabled");
  return (
    <PhoneFrame>
      <AppHeader left={<BackButton />} title="Pack Viagem" />
      <main className="flex-1 px-4 pb-8">
        <div className="rounded-[2rem] bg-ocean-grad p-6 text-ocean-foreground pattern-leaf">
          <div className="flex items-start justify-between"><Plane className="size-10" />{!on && <SoonBadge />}</div>
          <h1 className="mt-3 font-display text-3xl font-extrabold">Pack Viagem STP</h1>
          <p className="mt-1 text-sm opacity-85">Expressões essenciais para quem visita as ilhas. O conteúdo em Forro será validado antes de ser publicado.</p>
        </div>
        {!data ? <LoadingState /> : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {data.map((c) => (
              <div key={c.id} className="relative rounded-3xl border-2 border-border bg-surface p-4">
                <span className="text-3xl">{c.icon}</span>
                <p className="mt-2 font-display font-extrabold">{c.name}</p>
                <p className="text-xs text-muted-foreground">Conteúdo por adicionar</p>
                {!on && <Lock className="absolute right-3 top-3 size-4 text-muted-foreground" />}
              </div>
            ))}
          </div>
        )}
        <AppButton className="mt-6" variant="secondary" disabled={!on}>{on ? "Abrir pack" : "Avisa-me quando sair"}</AppButton>
      </main>
    </PhoneFrame>
  );
}
