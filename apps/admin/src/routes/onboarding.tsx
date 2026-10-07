import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { PREVIEW_ENABLED } from "@/lib/preview-quiz";
import { PhoneFrame } from "@/layouts/AppShell";
import { cn } from "@/lib/utils";
import i18n from "@/i18n";
import { authService } from "@/services";

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
  const navigate = useNavigate();
  const { locale } = useSettings();
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
            <Link to="/login">
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
                        // Em desenvolvimento, o Kriolu abre a pré-visualização com rascunhos.
                        const preview = PREVIEW_ENABLED && !l.available && l.id === "kabuverdianu";
                        const card = (
                          <div
                            key={l.id}
                            className={cn(
                              "flex items-center gap-4 rounded-3xl border-[1.5px] p-4",
                              l.available
                                ? "border-primary bg-primary/5"
                                : preview
                                  ? "pressable border-accent bg-accent/10"
                                  : "border-border bg-surface opacity-60",
                            )}
                          >
                            <div
                              className={cn(
                                "grid size-14 place-items-center rounded-2xl font-display text-xl font-bold",
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
                            {l.available ? (
                              <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold uppercase text-success">
                                {t("common.available")}
                              </span>
                            ) : preview ? (
                              <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
                                {t("onboarding.testDraft")}
                              </span>
                            ) : (
                              <SoonBadge />
                            )}
                          </div>
                        );
                        return preview ? (
                          <Link key={l.id} to="/preview/kriolu" className="block">
                            {card}
                          </Link>
                        ) : (
                          card
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
        {step === 5 && <Register onDone={() => navigate({ to: "/learn" })} />}
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

function Register({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState<CountryId | "">("");
  const [spoken, setSpoken] = useState<SpokenLanguageId[]>([]);
  const toggleSpoken = (id: SpokenLanguageId) =>
    setSpoken((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!country || spoken.length === 0) return;
    const f = new FormData(e.currentTarget);
    setLoading(true);
    await authService.signUp({
      name: String(f.get("name")),
      username: String(f.get("username")),
      email: String(f.get("email")),
      password: String(f.get("password")),
      country,
      spokenLanguages: spoken,
    });
    onDone();
  };

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col">
      <h1 className="font-display text-2xl font-bold">{t("register.title")}</h1>
      <div className="mt-6 space-y-3">
        <Field name="name" label={t("register.name")} autoComplete="name" />
        <Field name="username" label={t("register.username")} autoComplete="username" />
        <Field name="email" label={t("register.email")} type="email" autoComplete="email" />
        <Field
          name="password"
          label={t("register.password")}
          type="password"
          autoComplete="new-password"
        />
        <label className="block">
          <span className="sr-only">{t("register.country")}</span>
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
              {t("register.country")} — {t("register.countryPlaceholder")}
            </option>
            {COUNTRY_IDS.map((id) => (
              <option key={id} value={id}>
                {t(`countries.${id}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

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
        <AppButton type="submit" disabled={loading || !country || spoken.length === 0}>
          {loading ? t("register.creating") : t("register.create")}
        </AppButton>
        <AppButton type="button" variant="secondary" onClick={onDone}>
          <GoogleG />
          {t("register.google")}
        </AppButton>
        <Link to="/login" className="block text-center text-sm font-bold text-primary">
          {t("onboarding.haveAccount")}
        </Link>
      </div>
    </form>
  );
}

export function Field({
  label,
  ...p
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input
        required
        placeholder={label}
        {...p}
        className="h-14 w-full rounded-2xl card px-4 font-semibold outline-none transition focus:border-primary"
      />
    </label>
  );
}

export const GoogleG = () => (
  <span className="grid size-5 place-items-center rounded-full bg-ocean font-sans text-[11px] font-black text-ocean-foreground">
    G
  </span>
);
