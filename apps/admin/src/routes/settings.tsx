import { useClerk, useUser } from "@clerk/tanstack-react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, LogOut } from "lucide-react";
import { BackButton } from "@/components/app/BackButton";
import { AppHeader, PhoneFrame } from "@/layouts/AppShell";
import { cn } from "@/lib/utils";
import { settings, useSettings } from "@/hooks/use-settings";
import { useTranslation } from "react-i18next";
import { LOCALES } from "@stp/i18n";
import { useLanguages } from "@/hooks/use-service";
import { sound } from "@/lib/sound";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Definições — Língua STP" },
      { name: "description", content: "Conta, idioma, som, notificações e privacidade." },
      { property: "og:title", content: "Definições — Língua STP" },
      { property: "og:description", content: "Personaliza a tua experiência." },
    ],
  }),
  component: Settings,
});

function Toggle({
  label,
  k,
}: {
  label: string;
  k: "sound" | "effects" | "haptics" | "notifications";
}) {
  const prefs = useSettings();
  const on = prefs[k];
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => {
        settings.set({ [k]: !on });
        if (!on && k !== "notifications") sound.play("select");
      }}
      className="flex w-full items-center justify-between px-4 py-3.5 font-semibold"
    >
      {label}
      <span
        className={cn("relative h-7 w-12 rounded-full transition", on ? "bg-primary" : "bg-border")}
      >
        <span
          className={cn(
            "absolute top-1 size-5 rounded-full bg-surface transition-all",
            on ? "left-6" : "left-1",
          )}
        />
      </span>
    </button>
  );
}
const Row = ({
  label,
  value,
  to,
}: {
  label: string;
  value?: string | undefined;
  to?: "/premium" | "/settings/account";
}) => {
  const inner = (
    <span className="flex w-full items-center justify-between px-4 py-3.5 font-semibold">
      {label}
      <span className="flex items-center gap-1 text-sm text-muted-foreground">
        {value}
        <ChevronRight className="size-4" />
      </span>
    </span>
  );
  return to ? <Link to={to}>{inner}</Link> : <button className="w-full">{inner}</button>;
};
const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-5">
    <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
      {title}
    </h2>
    <div className="divide-y divide-border overflow-hidden rounded-2xl card">{children}</div>
  </section>
);

/** Escolha do idioma da interface: muda logo a app inteira. */
function LanguageRow() {
  const { t, i18n } = useTranslation();
  const { locale } = useSettings();
  const current = locale ?? i18n.language;
  return (
    <div className="flex w-full items-center justify-between gap-3 px-4 py-3 font-semibold">
      {t("settings.uiLanguage")}
      <div
        className="flex rounded-xl bg-muted/80 p-1"
        role="radiogroup"
        aria-label={t("settings.uiLanguage")}
      >
        {LOCALES.map((l) => (
          <button
            key={l.id}
            role="radio"
            aria-checked={current === l.id}
            disabled={!l.available}
            title={l.available ? l.label : `${l.label} — ${t("common.soon")}`}
            onClick={() => settings.set({ locale: l.id })}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold uppercase transition-all",
              current === l.id ? "bg-surface text-primary shadow-card" : "text-muted-foreground",
              !l.available && "opacity-40",
            )}
          >
            {l.id}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Língua que o utilizador está a aprender (só as disponíveis; Beta assinalado). */
function LearningRow() {
  const { t } = useTranslation();
  const { learning } = useSettings();
  const { data: langs } = useLanguages();
  const options = (langs ?? []).filter((l) => l.available);
  return (
    <div className="flex w-full items-center justify-between gap-3 px-4 py-3 font-semibold">
      {t("settings.learning")}
      <div
        className="flex rounded-xl bg-muted/80 p-1"
        role="radiogroup"
        aria-label={t("settings.learning")}
      >
        {options.map((l) => (
          <button
            key={l.id}
            role="radio"
            aria-checked={learning === l.id}
            onClick={() => settings.set({ learning: l.id })}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
              learning === l.id ? "bg-surface text-primary shadow-card" : "text-muted-foreground",
            )}
          >
            {l.name.split(" / ")[0]}
            {l.beta ? " β" : ""}
          </button>
        ))}
      </div>
    </div>
  );
}

function Settings() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { signOut } = useClerk();
  return (
    <PhoneFrame>
      <AppHeader left={<BackButton />} title={t("settings.title")} />
      <main className="flex-1 px-4 pb-10">
        <Group title={t("settings.general")}>
          <Row
            label={t("settings.account")}
            value={user?.primaryEmailAddress?.emailAddress}
            to="/settings/account"
          />
          <LanguageRow />
          <LearningRow />
          <Row label={t("settings.premium")} value={t("settings.free")} to="/premium" />
        </Group>
        <Group title={t("settings.preferences")}>
          <Toggle label={t("settings.sound")} k="sound" />
          <Toggle label={t("settings.effects")} k="effects" />
          <Toggle label={t("settings.haptics")} k="haptics" />
          <Toggle label={t("settings.notifications")} k="notifications" />
        </Group>
        <Group title={t("settings.support")}>
          <Row label={t("settings.privacy")} />
          <Row label={t("settings.help")} />
          <Row label={t("settings.terms")} />
          <Row label={t("settings.privacyPolicy")} />
        </Group>
        <button
          onClick={() => void signOut({ redirectUrl: "/" })}
          className="pressable mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-destructive/40 py-3.5 font-bold text-destructive"
        >
          <LogOut className="size-5" />
          {t("settings.signOut")}
        </button>
      </main>
    </PhoneFrame>
  );
}
