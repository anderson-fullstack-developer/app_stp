import { createFileRoute } from "@tanstack/react-router";
import { Check, Coins } from "lucide-react";
import { useState } from "react";
import { AdSlot, RewardedAdCard } from "@/components/app/Ads";
import { BackButton } from "@/components/app/BackButton";
import { CoinBadge } from "@/components/app/Badges";
import { AppButton } from "@/components/app/Buttons";
import { LoadingState, Modal, SectionTitle } from "@/components/app/Primitives";
import { game, useGame } from "@/hooks/use-game";
import { useShop } from "@/hooks/use-service";
import { AppHeader, PhoneFrame } from "@/layouts/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Loja — Língua STP" },
      {
        name: "description",
        content: "Troca moedas por avatares, molduras, badges, Streak Freeze e temas.",
      },
      { property: "og:title", content: "Loja — Língua STP" },
      { property: "og:description", content: "Gasta as tuas moedas na loja." },
    ],
  }),
  component: Shop,
});

function Shop() {
  const { data } = useShop();
  const g = useGame();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <PhoneFrame>
      <AppHeader left={<BackButton />} title="Loja" right={<CoinBadge value={g.coins} />} />
      <main className="flex-1 px-4 pb-8">
        <div className="rounded-3xl bg-cocoa p-5 text-secondary-foreground pattern-leaf">
          <p className="text-xs font-bold uppercase tracking-widest opacity-75">O teu saldo</p>
          <p className="inline-flex items-center gap-2 font-display text-4xl font-bold">
            <Coins className="size-8 text-accent" />
            {g.coins}
          </p>
          <p className="mt-1 text-xs opacity-75">
            Ganha moedas com lições, desafios e anúncios recompensados. Não é possível comprar
            moedas.
          </p>
        </div>
        <div className="mt-3">
          <RewardedAdCard />
        </div>
        <SectionTitle>Artigos</SectionTitle>
        {!data ? (
          <LoadingState />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {data.map((it) => {
              const owned = g.owned.includes(it.id);
              const cant = !owned && g.coins < it.price;
              return (
                <div
                  key={it.id}
                  className={cn(
                    "flex flex-col rounded-3xl border-[1.5px] bg-surface p-3",
                    owned ? "border-success" : "border-border",
                  )}
                >
                  <div className="grid h-20 place-items-center rounded-2xl bg-muted text-4xl">
                    {it.icon}
                  </div>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {it.category}
                  </p>
                  <p className="text-sm font-bold leading-tight">{it.name}</p>
                  <AppButton
                    size="sm"
                    className="mt-3 w-full"
                    variant={owned ? "secondary" : "sun"}
                    disabled={owned || cant}
                    onClick={() => {
                      if (game.buy(it.id, it.price)) setMsg(it.name);
                    }}
                  >
                    {owned ? (
                      <>
                        <Check className="size-4" />
                        Teu
                      </>
                    ) : (
                      <>
                        <Coins className="size-4" />
                        {it.price}
                      </>
                    )}
                  </AppButton>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-6">
          <AdSlot placement="shop" />
        </div>
      </main>
      <Modal open={!!msg} onClose={() => setMsg(null)}>
        <p className="text-center text-5xl">🎁</p>
        <p className="mt-2 text-center font-display text-xl font-bold">{msg} desbloqueado!</p>
        <AppButton className="mt-5" onClick={() => setMsg(null)}>
          Boa!
        </AppButton>
      </Modal>
    </PhoneFrame>
  );
}
