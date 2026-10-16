/**
 * Porta de entrada das áreas de gravação: sessão, convite (papel) e consentimento 18+.
 * Só mostra `children` quando a pessoa pode mesmo gravar/ouvir.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { VOICE_CONFIG } from "@stp/config";
import type { VoiceMeDto } from "@stp/types/api";
import { Check, Mic } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/app/Buttons";
import { ErrorState, LoadingState } from "@/components/app/Primitives";
import { cn } from "@/lib/utils";
import { useVoiceMe, voiceError } from "@/hooks/use-voice";
import { voiceApi, voiceKeys } from "@/services/voice-api.service";

export function VoiceGate({ children }: { children: (me: VoiceMeDto) => ReactNode }) {
  const { t } = useTranslation();
  const me = useVoiceMe();
  if (me.isPending) return <LoadingState />;
  if (!me.data) return <ErrorState onRetry={() => void me.refetch()} />;
  const invited = me.data.speakerLanguages.length + me.data.listenerLanguages.length > 0;
  if (!invited) {
    return (
      <div className="card rounded-2xl p-5 text-center">
        <Mic className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-2 font-semibold">{t("voice.notInvited")}</p>
      </div>
    );
  }
  if (!me.data.profile?.consentCurrent) return <ConsentForm me={me.data} />;
  return <>{children(me.data)}</>;
}

function ConsentForm({ me }: { me: VoiceMeDto }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState(me.profile?.displayName ?? "");
  const [region, setRegion] = useState(me.profile?.region ?? "");
  const [adult, setAdult] = useState(false);
  const [accept, setAccept] = useState(false);
  const languageId = me.speakerLanguages[0]?.id ?? me.listenerLanguages[0]?.id ?? "";
  const regions = VOICE_CONFIG.regions[languageId] ?? [];
  const age = VOICE_CONFIG.minimumAge;
  const save = useMutation({
    mutationFn: () =>
      voiceApi.saveProfile({
        displayName: displayName.trim() || null,
        region: region || null,
        adultConfirmed: adult,
        consentAccepted: accept,
      }),
    onSuccess: (data) => qc.setQueryData(voiceKeys.me, data),
  });
  const items = ["age", "use", "voice", "quality", "pay"] as const;

  return (
    <div className="space-y-4">
      <div className="card rounded-2xl p-5">
        <h2 className="font-display text-xl font-bold">{t("voice.consentTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("voice.consentIntro")}</p>
        <ul className="mt-3 space-y-2 text-sm">
          {items.map((k) => (
            <li key={k} className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{t(`voice.consentItems.${k}`, { age })}</span>
            </li>
          ))}
        </ul>
      </div>
      <label className="block">
        <span className="text-sm font-bold">{t("voice.displayName")}</span>
        <input
          value={displayName}
          maxLength={60}
          onChange={(e) => setDisplayName(e.target.value)}
          className="mt-1 h-12 w-full rounded-xl border-[1.5px] border-border bg-surface px-3 outline-none focus:border-primary"
        />
        <span className="mt-1 block text-xs text-muted-foreground">
          {t("voice.displayNameHint")}
        </span>
      </label>
      {regions.length > 0 && (
        <label className="block">
          <span className="text-sm font-bold">{t("voice.region")}</span>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="mt-1 h-12 w-full rounded-xl border-[1.5px] border-border bg-surface px-3 outline-none focus:border-primary"
          >
            <option value="">{t("voice.regionNone")}</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      )}
      {(
        [
          [adult, setAdult, t("voice.adult", { age })],
          [accept, setAccept, t("voice.accept")],
        ] as const
      ).map(([on, set, label]) => (
        <button
          key={label}
          type="button"
          role="checkbox"
          aria-checked={on}
          onClick={() => set(!on)}
          className="flex w-full items-center gap-3 rounded-xl p-2 text-left font-semibold"
        >
          <span
            className={cn(
              "grid size-6 shrink-0 place-items-center rounded-md border-[1.5px]",
              on ? "border-primary bg-primary text-primary-foreground" : "border-border",
            )}
          >
            {on && <Check className="size-4" />}
          </span>
          {label}
        </button>
      ))}
      {save.isError && (
        <p className="text-center text-sm font-bold text-destructive">
          {voiceError(t, save.error)}
        </p>
      )}
      <AppButton disabled={!adult || !accept || save.isPending} onClick={() => save.mutate()}>
        {save.isPending ? t("voice.saving") : t("voice.start")}
      </AppButton>
    </div>
  );
}
