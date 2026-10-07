import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, LogOut } from "lucide-react";
import { BackButton } from "@/components/app/BackButton";
import { AppHeader, PhoneFrame } from "@/layouts/AppShell";
import { cn } from "@/lib/utils";
import { settings, useSettings } from "@/hooks/use-settings";
import { sound } from "@/lib/sound";
import { authService } from "@/services";

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
const Row = ({ label, value, to }: { label: string; value?: string; to?: "/premium" }) => {
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

function Settings() {
  const navigate = useNavigate();
  return (
    <PhoneFrame>
      <AppHeader left={<BackButton />} title="Definições" />
      <main className="flex-1 px-4 pb-10">
        <Group title="Geral">
          <Row label="Conta" value="@anderson" />
          <Row label="Idioma da interface" value="Português" />
          <Row label="Língua estudada" value="Forro" />
          <Row label="Conta Premium" value="Gratuita" to="/premium" />
        </Group>
        <Group title="Preferências">
          <Toggle label="Som" k="sound" />
          <Toggle label="Efeitos sonoros" k="effects" />
          <Toggle label="Vibração" k="haptics" />
          <Toggle label="Notificações" k="notifications" />
        </Group>
        <Group title="Suporte">
          <Row label="Privacidade" />
          <Row label="Ajuda" />
          <Row label="Termos" />
          <Row label="Política de Privacidade" />
        </Group>
        <button
          onClick={async () => {
            await authService.signOut();
            navigate({ to: "/login" });
          }}
          className="pressable mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-destructive/40 py-3.5 font-bold text-destructive"
        >
          <LogOut className="size-5" />
          Terminar sessão
        </button>
      </main>
    </PhoneFrame>
  );
}
