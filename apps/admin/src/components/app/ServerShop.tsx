import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ShopDto, ShopPurchaseDto } from "@stp/types/api";
import { Coins, Snowflake } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BackButton } from "@/components/app/BackButton";
import { CoinBadge } from "@/components/app/Badges";
import { AppButton } from "@/components/app/Buttons";
import { Neto } from "@/components/app/Neto";
import { ErrorState, LoadingState, Modal, SectionTitle } from "@/components/app/Primitives";
import { AppHeader, PhoneFrame } from "@/layouts/AppShell";
import { sound } from "@/lib/sound";
import { ApiError, http } from "@/services/http";

const shopApi = {
  get: () => http.get<ShopDto>("shop"),
  buyFreeze: (requestId: string) =>
    http.post<ShopPurchaseDto>("shop", ["streak-freeze"], { requestId }),
};

/** Loja com dados do servidor: por agora, a proteção de streak paga com moedas. */
export function ServerShop() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const shop = useQuery({ queryKey: ["shop"], queryFn: shopApi.get });
  // Um id por compra: se a rede falhar e a pessoa tocar outra vez, o servidor não cobra duas vezes.
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [done, setDone] = useState(false);
  const buy = useMutation({
    mutationFn: () => shopApi.buyFreeze(requestId),
    onSuccess: () => {
      sound.play("coins");
      setDone(true);
      setRequestId(crypto.randomUUID());
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["shop"] });
      void qc.invalidateQueries({ queryKey: ["account"] });
    },
  });
  const data = shop.data;
  const freeze = data?.items.find((i) => i.id === "streak_freeze");
  const errorCode =
    buy.error instanceof ApiError
      ? (buy.error.body as { code?: string } | undefined)?.code
      : undefined;

  return (
    <PhoneFrame>
      <AppHeader
        left={<BackButton />}
        title={t("shop.title")}
        right={data ? <CoinBadge value={data.coins} /> : null}
      />
      <main className="flex-1 px-4 pb-8">
        {shop.isPending ? (
          <LoadingState />
        ) : !data ? (
          <ErrorState onRetry={() => void shop.refetch()} />
        ) : (
          <>
            <div className="animate-rise rounded-3xl bg-cocoa p-5 text-secondary-foreground pattern-leaf">
              <p className="text-xs font-bold uppercase tracking-widest opacity-75">
                {t("shop.balance")}
              </p>
              <p className="inline-flex items-center gap-2 font-display text-4xl font-bold">
                <Coins className="size-8 text-accent" />
                {data.coins}
              </p>
              <p className="mt-1 text-xs opacity-75">{t("shop.balanceNote")}</p>
            </div>
            <SectionTitle>{t("shop.items")}</SectionTitle>
            {freeze && (
              <div className="card animate-rise rounded-3xl p-4">
                <div className="flex items-start gap-3">
                  <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-ocean-grad text-ocean-foreground">
                    <Snowflake className="size-8" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-bold leading-tight">
                      {t("shop.freezeName")}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {t("shop.freezeText", { max: freeze.max })}
                    </p>
                    <p className="mt-1 text-xs font-bold text-primary">
                      {t("shop.owned", { owned: freeze.owned, max: freeze.max })}
                    </p>
                  </div>
                </div>
                <AppButton
                  className="mt-4"
                  variant="sun"
                  disabled={!freeze.canBuy}
                  loading={buy.isPending}
                  onClick={() => buy.mutate()}
                >
                  {freeze.owned >= freeze.max ? (
                    t("shop.full")
                  ) : (
                    <>
                      <Coins className="size-5" />
                      {t("shop.buy")} · {freeze.price}
                    </>
                  )}
                </AppButton>
                {(errorCode === "NOT_ENOUGH_COINS" ||
                  (freeze.owned < freeze.max && data.coins < freeze.price)) && (
                  <p className="mt-2 text-center text-sm font-semibold text-muted-foreground">
                    {t("shop.notEnough")}
                  </p>
                )}
                {buy.isError && errorCode !== "NOT_ENOUGH_COINS" && (
                  <p
                    role="alert"
                    className="mt-2 text-center text-sm font-semibold text-destructive"
                  >
                    {t("social.error")}
                  </p>
                )}
              </div>
            )}
            <p className="mt-4 text-center text-sm text-muted-foreground">{t("shop.moreSoon")}</p>
          </>
        )}
      </main>
      <Modal open={done} onClose={() => setDone(false)}>
        <div className="flex flex-col items-center text-center">
          <Neto mood="celebrate" size={96} />
          <p className="mt-2 font-display text-xl font-bold">{t("shop.bought")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("shop.boughtText")}</p>
        </div>
        <AppButton className="mt-5" onClick={() => setDone(false)}>
          {t("shop.nice")}
        </AppButton>
      </Modal>
    </PhoneFrame>
  );
}
