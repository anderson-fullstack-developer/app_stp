import { createFileRoute } from "@tanstack/react-router";
import { Check, Crown, Minus } from "lucide-react";
import { useState } from "react";
import { BackButton } from "@/components/app/BackButton";
import { AppButton } from "@/components/app/Buttons";
import { Modal } from "@/components/app/Primitives";
import { APP_CONFIG, APP_NAME } from "@stp/config";
import { usePlans } from "@/hooks/use-service";
import { PhoneFrame } from "@/layouts/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/premium")({
  head: () => ({
    meta: [
      { title: `Premium — ${APP_NAME}` },
      { name: "description", content: "Sem anúncios, mais exercícios e estatísticas avançadas." },
      { property: "og:title", content: `Premium — ${APP_NAME}` },
      { property: "og:description", content: "Aprende ainda mais com Premium." },
    ],
  }),
  component: Premium,
});

const ROWS: [string, boolean, boolean][] = [
  ["Aprendizagem principal", true, true],
  ["XP, streak e ranking", true, true],
  ["Amigos e desafios", true, true],
  ["Multiplayer básico", true, true],
  ["Sem anúncios", false, true],
  ["Mais exercícios", false, true],
  ["Estatísticas avançadas", false, true],
  ["Conteúdo extra", false, true],
  ["Personalização", false, true],
  ["Modo offline (futuro)", false, true],
  ["Treino avançado de pronúncia (futuro)", false, true],
];

function Premium() {
  const { data: plans } = usePlans();
  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly");
  const [open, setOpen] = useState(false);
  return (
    <PhoneFrame className="bg-cocoa text-secondary-foreground">
      <div className="px-4 pt-3 safe-top">
        <BackButton close />
      </div>
      <main className="flex flex-1 flex-col px-5 pb-6">
        <div className="mx-auto grid size-20 place-items-center rounded-3xl bg-sun text-accent-foreground animate-float">
          <Crown className="size-10" />
        </div>
        <h1 className="mt-4 text-center font-display text-3xl font-bold leading-tight">
          Aprende ainda mais com Premium
        </h1>

        <div className="mt-6 overflow-hidden rounded-3xl bg-secondary-foreground/8 ring-1 ring-secondary-foreground/15">
          <div className="grid grid-cols-[1fr_56px_72px] items-center px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider">
            <span className="opacity-70">Incluído</span>
            <span className="text-center opacity-70">Free</span>
            <span className="rounded-lg bg-accent py-1 text-center text-accent-foreground">
              Premium
            </span>
          </div>
          {ROWS.map(([label, free, prem]) => (
            <div
              key={label}
              className="grid grid-cols-[1fr_56px_72px] items-center border-t border-secondary-foreground/10 px-4 py-2.5 text-sm font-semibold"
            >
              <span>{label}</span>
              <span className="flex justify-center">
                {free ? (
                  <Check className="size-4 opacity-80" />
                ) : (
                  <Minus className="size-4 opacity-40" />
                )}
              </span>
              <span className="flex justify-center">
                {prem && (
                  <Check className="size-5 rounded-full bg-accent p-0.5 text-accent-foreground" />
                )}
              </span>
            </div>
          ))}
          <p className="border-t border-secondary-foreground/10 px-4 py-2 text-[11px] opacity-60">
            O plano Free inclui anúncios moderados, nunca durante exercícios ou partidas.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {plans?.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlan(p.id)}
              aria-pressed={plan === p.id}
              className={cn(
                "pressable relative flex w-full items-center justify-between rounded-2xl border-[1.5px] p-4 text-left",
                plan === p.id ? "border-accent bg-accent/15" : "border-secondary-foreground/20",
              )}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-4 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground">
                  {p.highlight}
                </span>
              )}
              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full border-[1.5px]",
                    plan === p.id ? "border-accent bg-accent" : "border-secondary-foreground/40",
                  )}
                >
                  {plan === p.id && <Check className="size-3 text-accent-foreground" />}
                </span>
                <span className="font-display text-lg font-bold">{p.label}</span>
              </span>
              <span>
                <span className="font-display text-xl font-bold">{p.price}</span>
                <span className="text-sm opacity-75">{p.period}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-auto pt-6 safe-bottom">
          <AppButton variant="sun" onClick={() => setOpen(true)}>
            Experimentar Premium
          </AppButton>
          <p className="mt-3 text-center text-xs opacity-70">
            {APP_CONFIG.pricing.provisionalNote}
          </p>
        </div>
      </main>
      <Modal open={open} onClose={() => setOpen(false)}>
        <p className="text-center font-display text-xl font-bold text-foreground">Em breve</p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Os pagamentos ainda não estão disponíveis.
        </p>
        <AppButton className="mt-5" onClick={() => setOpen(false)}>
          Entendido
        </AppButton>
      </Modal>
    </PhoneFrame>
  );
}
