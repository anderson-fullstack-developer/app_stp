import { SignUp } from "@clerk/tanstack-react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  COUNTRY_IDS,
  LOCALES,
  SPOKEN_LANGUAGE_IDS,
  type CountryId,
  type SpokenLanguageId,
} from "@stp/i18n";
import island from "@/assets/island.jpg";
import { AppButton } from "@/components/app/Buttons";
import { SoonBadge } from "@/components/app/Badges";
import { ProgressBar } from "@/components/app/Primitives";
import { settings, useSettings } from "@/hooks/use-settings";
import { useCountries, useLanguages } from "@/hooks/use-service";
import { PhoneFrame } from "@/layouts/AppShell";
import { cn } from "@/lib/utils";
import i18n from "@/i18n";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Começar — Língua STP" },
      { name: "description", content: "Escolhe a tua língua, o teu objetivo e cria a tua conta." },
      { property: "og:title", content: "Começar — Língua STP" },
      { property: "og:description", content: "Escolhe a tua língua e começa a aprender." },
    ],
  }),
  component: Onboarding,
});

const REASONS = [
  { id: "family", icon: "👨‍👩‍👧" },
  { id: "culture", icon: "🥁" },
  { id: "travel", icon: "🏝️" },
  { id: "curiosity", icon: "✨" },
  { id: "school", icon: "🎓" },
  { id: "speakBetter", icon: "🗣️" },
  { id: "other", icon: "💬" },
] as const;
type ReasonId = (typeof REASONS)[number]["id"];

const GOALS = [
  { minutes: 5, id: "casual" },
  { minutes: 10, id: "regular" },
  { minutes: 15, id: "serious" },
  { minutes: 20, id: "intense" },
] as const;

/** Passos depois das boas-vindas (para a barra de progresso). */
const STEPS = 5;

function Onboarding() {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [reasons, setReasons] = useState<ReasonId[]>([]);
  const [minutes, setMinutes] = useState<number | null>(null);
  const { locale, learning } = useSettings();
  const { data: langs } = useLanguages();
  const { data: countries } = useCountries();
  const currentLocale = locale ?? i18n.language;

  if (step === 0) {
    return (
      <PhoneFrame>
        <div className="relative h-[52vh] max-h-[460px] overflow-hidden rounded-b-[3rem]">
          <img
            src={island}
            alt={t("onboarding.welcomeImageAlt")}
            className="h-full w-full object-cover"
            width={816}
            height={816}
          />
        </div>
        <div className="flex flex-1 flex-col px-6 pt-8 safe-bottom pb-6">
          <h1 className="animate-rise font-display text-3xl font-bold leading-tight">
            {t("onboarding.welcomeTitle")}
          </h1>
          <p className="animate-rise mt-3 text-muted-foreground" style={{ animationDelay: ".1s" }}>
            {t("onboarding.welcomeText")}
          </p>
          <div className="mt-auto space-y-3 pt-6">
            <AppButton onClick={() => setStep(1)}>{t("onboarding.start")}</AppButton>
            <Link to="/sign-in/$" params={{ _splat: "" }}>
              <AppButton variant="ghost" size="md" className="w-full">
                {t("onboarding.haveAccount")}
              </AppButton>
            </Link>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  const canNext =
    step === 1 ||
    step === 2 ||
    (step === 3 && reasons.length > 0) ||
    (step === 4 && minutes !== null);

  return (
    <PhoneFrame>
      <div className="flex items-center gap-3 px-4 pt-4 safe-top">
        <button
          onClick={() => setStep(step - 1)}
          aria-label={t("common.back")}
          className="grid size-10 place-items-center rounded-full text-muted-foreground"
        >
          <ArrowLeft />
        </button>
        <ProgressBar value={(step / STEPS) * 100} />
      </div>
      <div key={step} className="animate-rise flex flex-1 flex-col px-5 pt-6">
        {step === 1 && (
          <>
            <h1 className="font-display text-2xl font-bold">{t("onboarding.uiLanguageTitle")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("onboarding.uiLanguageText")}</p>
            <div className="mt-6 space-y-3">
              {LOCALES.map((l) => {
                const on = l.available && currentLocale === l.id;
                return (
                  <button
                    key={l.id}
                    disabled={!l.available}
                    onClick={() => settings.set({ locale: l.id })}
                    aria-pressed={on}
                    className={cn(
                      "pressable flex w-full items-center justify-between rounded-2xl border-[1.5px] p-4 text-left font-bold",
                      on ? "border-primary bg-primary/5" : "border-border bg-surface",
                      !l.available && "opacity-60",
                    )}
                  >
                    <span>{l.label}</span>
                    {on ? (
                      <Check className="size-5 rounded-full bg-primary p-0.5 text-primary-foreground" />
                    ) : !l.available ? (
                      <SoonBadge />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h1 className="font-display text-2xl font-bold">{t("onboarding.learnTitle")}</h1>
            <div className="mt-6 space-y-6">
              {countries?.map((c) => (
                <section key={c.id} aria-label={t(`countries.${c.id as CountryId}`)}>
                  <h2 className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t(`countries.${c.id as CountryId}`)}
                  </h2>
                  <div className="space-y-3">
                    {langs
                      ?.filter((l) => l.countryId === c.id)
                      .map((l) => {
                        const on = l.available && learning === l.id;
                        return (
                          <button
                            key={l.id}
                            type="button"
                            disabled={!l.available}
                            onClick={() => settings.set({ learning: l.id })}
                            aria-pressed={on}
                            className={cn(
                              "pressable flex w-full items-center gap-4 rounded-3xl border-[1.5px] p-4 text-left",
                              on
                                ? "border-primary bg-primary/5"
                                : l.available
                                  ? "border-border bg-surface"
                                  : "border-border bg-surface opacity-60",
                            )}
                          >
                            <div
                              className={cn(
                                "grid size-14 shrink-0 place-items-center rounded-2xl font-display text-xl font-bold",
                                l.available
                                  ? "bg-forest text-primary-foreground"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              {l.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <p className="font-display font-bold">{l.name}</p>
                              <p className="text-xs text-muted-foreground">{l.region}</p>
                            </div>
                            {!l.available ? (
                              <SoonBadge />
                            ) : l.beta ? (
                              <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
                                {t("kriolu.beta")}
                              </span>
                            ) : (
                              <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold uppercase text-success">
                                {t("common.available")}
                              </span>
                            )}
                            {on && (
                              <Check className="size-5 shrink-0 rounded-full bg-primary p-0.5 text-primary-foreground" />
                            )}
                          </button>
                        );
                      })}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h1 className="font-display text-2xl font-bold">{t("onboarding.reasonsTitle")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("onboarding.reasonsText")}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {REASONS.map((r) => {
                const on = reasons.includes(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() =>
                      setReasons(on ? reasons.filter((x) => x !== r.id) : [...reasons, r.id])
                    }
                    aria-pressed={on}
                    className={cn(
                      "pressable relative flex flex-col items-start gap-2 rounded-3xl border-[1.5px] p-4 text-left font-bold",
                      on ? "border-primary bg-primary/5" : "border-border bg-surface",
                    )}
                  >
                    <span className="text-3xl">{r.icon}</span>
                    {t(`onboarding.reasons.${r.id}`)}
                    {on && (
                      <Check className="absolute right-3 top-3 size-5 rounded-full bg-primary p-0.5 text-primary-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
        {step === 4 && (
          <>
            <h1 className="font-display text-2xl font-bold">{t("onboarding.goalTitle")}</h1>
            <div className="mt-6 space-y-3">
              {GOALS.map((g) => (
                <button
                  key={g.minutes}
                  onClick={() => setMinutes(g.minutes)}
                  aria-pressed={minutes === g.minutes}
                  className={cn(
                    "pressable flex w-full items-center justify-between rounded-2xl border-[1.5px] p-4 font-bold",
                    minutes === g.minutes
                      ? "border-primary bg-primary/5"
                      : "border-border bg-surface",
                  )}
                >
                  <span>{t("common.minutes", { count: g.minutes })}</span>
                  <span className="text-sm text-muted-foreground">
                    {t(`onboarding.goals.${g.id}`)}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
        {step === 5 && <Register reasons={reasons} minutes={minutes} />}
        {step < 5 && (
          <div className="mt-auto pb-6 pt-6 safe-bottom">
            <AppButton disabled={!canNext} onClick={() => setStep(step + 1)}>
              {t("common.continue")}
            </AppButton>
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}

/**
 * Último passo: perfil (país e línguas faladas) e depois a conta real no Clerk
 * (email + palavra-passe com verificação, ou Google). As escolhas do onboarding seguem
 * em unsafeMetadata para o backend gravar no utilizador quando o sincronizar.
 */
function Register({ reasons, minutes }: { reasons: string[]; minutes: number | null }) {
  const { t } = useTranslation();
  const { locale, learning } = useSettings();
  const [part, setPart] = useState<"profile" | "account">("profile");
  const [country, setCountry] = useState<CountryId | "">("");
  const [spoken, setSpoken] = useState<SpokenLanguageId[]>([]);
  const toggleSpoken = (id: SpokenLanguageId) =>
    setSpoken((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  if (part === "account") {
    return (
      <div className="flex flex-1 flex-col items-center">
        <SignUp
          routing="hash"
          signInUrl="/sign-in"
          forceRedirectUrl="/learn"
          unsafeMetadata={{
            countryCode: country,
            spokenLanguages: spoken,
            uiLocale: locale ?? i18n.language,
            learningLanguageId: learning,
            reasons,
            dailyGoalMinutes: minutes,
          }}
        />
        <button
          type="button"
          onClick={() => setPart("profile")}
          className="mt-4 text-sm font-semibold text-muted-foreground"
        >
          ← {t("common.back")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="font-display text-2xl font-bold">{t("register.title")}</h1>
      <label className="mt-6 block">
        <span className="mb-1.5 block text-sm font-semibold">{t("register.country")}</span>
        <select
          required
          value={country}
          onChange={(e) => setCountry(e.target.value as CountryId)}
          className={cn(
            "card h-14 w-full appearance-none rounded-2xl px-4 font-semibold outline-none transition focus:border-primary",
            !country && "text-muted-foreground",
          )}
        >
          <option value="" disabled>
            {t("register.countryPlaceholder")}
          </option>
          {COUNTRY_IDS.map((id) => (
            <option key={id} value={id}>
              {t(`countries.${id}`)}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="mt-6">
        <legend className="font-display text-lg font-bold">{t("register.spokenTitle")}</legend>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("register.spokenText")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SPOKEN_LANGUAGE_IDS.map((id) => {
            const on = spoken.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleSpoken(id)}
                aria-pressed={on}
                className={cn(
                  "pressable inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-2 text-sm font-semibold",
                  on ? "border-primary bg-primary/8 text-primary" : "border-border bg-surface",
                )}
              >
                {on && <Check className="size-4" />}
                {t(`spokenLanguages.${id}`)}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-auto space-y-3 pb-6 pt-6 safe-bottom">
        <AppButton disabled={!country || spoken.length === 0} onClick={() => setPart("account")}>
          {t("common.continue")}
        </AppButton>
        <Link
          to="/sign-in/$"
          params={{ _splat: "" }}
          className="block text-center text-sm font-bold text-primary"
        >
          {t("onboarding.haveAccount")}
        </Link>
      </div>
    </div>
  );
}
