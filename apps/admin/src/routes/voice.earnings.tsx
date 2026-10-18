import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { APP_NAME, VOICE_CONFIG } from "@stp/config";
import type { VoicePayoutMethod } from "@stp/types/api";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/app/Buttons";
import { LoadingState } from "@/components/app/Primitives";
import { VoiceGate } from "@/components/voice/VoiceGate";
import { VoicePage } from "@/components/voice/VoicePage";
import { voiceError } from "@/hooks/use-voice";
import { cn } from "@/lib/utils";
import { euros, voiceApi, voiceKeys } from "@/services/voice-api.service";

export const Route = createFileRoute("/voice/earnings")({
  head: () => ({
    meta: [{ title: `Ganhos — ${APP_NAME}` }, { name: "robots", content: "noindex" }],
  }),
  component: EarningsPage,
});

function EarningsPage() {
  const { t } = useTranslation();
  return (
    <VoicePage title={t("voice.earnings.title")}>
      <VoiceGate>
        {(me) => (
          <>
            <Summary />
            <PayoutDetails
              method={me.profile?.payoutMethod ?? null}
              details={me.profile?.payoutDetails ?? null}
            />
            <Payouts />
          </>
        )}
      </VoiceGate>
    </VoicePage>
  );
}

function Summary() {
  const { t, i18n } = useTranslation();
  const e = useQuery({ queryKey: voiceKeys.earnings, queryFn: voiceApi.earnings });
  if (e.isPending) return <LoadingState />;
  if (!e.data) return null;
  const tiles: [string, number, string?][] = [
    [t("voice.earnings.balance"), e.data.balanceCents, "text-primary"],
    [t("voice.earnings.week"), e.data.thisWeekCents],
    [t("voice.earnings.pending"), e.data.pendingCents],
    [t("voice.earnings.paid"), e.data.paidCents, "text-success"],
  ];
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {tiles.map(([label, cents, tone]) => (
          <div key={label} className="card rounded-2xl p-4">
            <p className="text-xs font-semibold text-muted-foreground">{label}</p>
            <p className={cn("mt-1 font-display text-2xl font-bold tabular-nums", tone)}>
              {euros(cents, i18n.language)}
            </p>
          </div>
        ))}
      </div>
      <p className="text-center text-sm font-semibold text-muted-foreground">
        {t("voice.earnings.total")}: {euros(e.data.earnedCents, i18n.language)}
      </p>
    </>
  );
}

function PayoutDetails({
  method: initialMethod,
  details: initialDetails,
}: {
  method: VoicePayoutMethod | null;
  details: string | null;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [method, setMethod] = useState<VoicePayoutMethod>(initialMethod ?? "SEPA");
  const [details, setDetails] = useState(initialDetails ?? "");
  const save = useMutation({
    mutationFn: () => voiceApi.savePayoutDetails(method, details.trim()),
    onSuccess: () => void qc.invalidateQueries({ queryKey: voiceKeys.me }),
  });
  const methods = VOICE_CONFIG.pay.methods as readonly VoicePayoutMethod[];
  return (
    <section className="card space-y-3 rounded-[1.5rem] p-4">
      <div>
        <h2 className="font-display text-lg font-bold">{t("voice.earnings.payTo")}</h2>
        <p className="text-xs text-muted-foreground">{t("voice.earnings.payToHint")}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {methods.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={method === m}
            onClick={() => setMethod(m)}
            className={cn(
              "pressable rounded-xl border-[1.5px] px-3 py-2.5 text-sm font-bold",
              method === m
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface",
            )}
          >
            {t(`voice.earnings.methods.${m}`)}
          </button>
        ))}
      </div>
      <input
        value={details}
        maxLength={120}
        onChange={(e) => setDetails(e.target.value)}
        placeholder={t(`voice.earnings.placeholders.${method}`)}
        autoComplete="off"
        className="h-12 w-full rounded-xl border-[1.5px] border-border bg-surface px-3 outline-none focus:border-primary"
      />
      {save.isError && (
        <p className="text-sm font-bold text-destructive">{voiceError(t, save.error)}</p>
      )}
      <AppButton
        size="md"
        disabled={details.trim().length < 3 || save.isPending}
        onClick={() => save.mutate()}
      >
        {save.isSuccess ? t("voice.earnings.saved") : t("voice.earnings.save")}
      </AppButton>
    </section>
  );
}

function Payouts() {
  const { t, i18n } = useTranslation();
  const e = useQuery({ queryKey: voiceKeys.earnings, queryFn: voiceApi.earnings }).data;
  if (!e) return null;
  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-bold">{t("voice.earnings.payouts")}</h2>
      {e.payouts.length === 0 ? (
        <p className="card rounded-2xl p-5 text-center text-sm font-semibold text-muted-foreground">
          {t("voice.earnings.noPayouts")}
        </p>
      ) : (
        <ul className="space-y-2">
          {e.payouts.map((p) => (
            <li key={p.id} className="card flex items-center gap-3 rounded-2xl p-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {new Date(p.paidAt).toLocaleDateString(i18n.language, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {t(`voice.earnings.methods.${p.method as VoicePayoutMethod}`, {
                    defaultValue: p.method,
                  })}
                  {p.reference ? ` · ${p.reference}` : ""}
                </p>
                {p.note && <p className="text-xs">{p.note}</p>}
              </div>
              <p className="font-display text-lg font-bold text-success tabular-nums">
                +{euros(p.amountCents, i18n.language)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
