import type { CountryId, SpokenLanguageId } from "@stp/i18n";
import { CheckCircle2, CloudOff, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAccountProfile } from "@/hooks/use-account";

/** Perfil guardado na nossa API (Neon). Escondido quando a API não está configurada. */
export function ServerProfileCard() {
  const { t } = useTranslation();
  const { data, isPending, isError, enabled } = useAccountProfile();
  if (!enabled) return null;

  const status = isError ? (
    <span className="flex items-center gap-1.5 text-destructive">
      <CloudOff className="size-4" /> {t("settings.syncFailed")}
    </span>
  ) : isPending ? (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> {t("settings.syncing")}
    </span>
  ) : (
    <span className="flex items-center gap-1.5 text-success">
      <CheckCircle2 className="size-4" /> {t("settings.synced")}
    </span>
  );

  return (
    <section className="w-full max-w-[25rem] rounded-2xl card p-4" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold">{t("settings.serverProfile")}</h2>
        <div className="text-xs font-semibold">{status}</div>
      </div>
      {data && (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">{t("settings.username")}</dt>
          <dd className="truncate text-right font-semibold">@{data.username}</dd>
          <dt className="text-muted-foreground">{t("settings.country")}</dt>
          <dd className="text-right font-semibold">
            {data.countryCode
              ? t(`countries.${data.countryCode as CountryId}`, data.countryCode)
              : t("settings.notSet")}
          </dd>
          <dt className="text-muted-foreground">{t("settings.spoken")}</dt>
          <dd className="text-right font-semibold">
            {data.spokenLanguages.length
              ? data.spokenLanguages
                  .map((l) => t(`spokenLanguages.${l as SpokenLanguageId}`, l))
                  .join(", ")
              : t("settings.notSet")}
          </dd>
        </dl>
      )}
    </section>
  );
}
