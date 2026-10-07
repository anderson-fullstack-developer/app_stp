import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { useState } from "react";
import island from "@/assets/island.jpg";
import { AppButton } from "@/components/app/Buttons";
import { SoonBadge } from "@/components/app/Badges";
import { ProgressBar } from "@/components/app/Primitives";
import { useCountries, useLanguages } from "@/hooks/use-service";
import { PREVIEW_ENABLED } from "@/lib/preview-quiz";
import { PhoneFrame } from "@/layouts/AppShell";
import { cn } from "@/lib/utils";
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

const REASONS = ["Família", "Cultura", "Viagem", "Curiosidade", "Escola", "Quero falar melhor"];
const REASON_ICONS = ["👨‍👩‍👧", "🥁", "🏝️", "✨", "🎓", "🗣️"];
const MINUTES = [
  { m: 5, l: "Casual" },
  { m: 10, l: "Regular" },
  { m: 15, l: "Sério" },
  { m: 20, l: "Intenso" },
];

function Onboarding() {
  const [step, setStep] = useState(0);
  const [reasons, setReasons] = useState<string[]>([]);
  const [minutes, setMinutes] = useState<number | null>(null);
  const navigate = useNavigate();
  const { data: langs } = useLanguages();
  const { data: countries } = useCountries();

  if (step === 0) {
    return (
      <PhoneFrame>
        <div className="relative h-[52vh] max-h-[460px] overflow-hidden rounded-b-[3rem]">
          <img
            src={island}
            alt="Ilha tropical com cacau"
            className="h-full w-full object-cover"
            width={816}
            height={816}
          />
        </div>
        <div className="flex flex-1 flex-col px-6 pt-8 safe-bottom pb-6">
          <h1 className="animate-rise font-display text-3xl font-bold leading-tight">
            Aprende as línguas de São Tomé e Príncipe
          </h1>
          <p className="animate-rise mt-3 text-muted-foreground" style={{ animationDelay: ".1s" }}>
            Descobre a língua, a cultura e compete com os teus amigos.
          </p>
          <div className="mt-auto space-y-3 pt-6">
            <AppButton onClick={() => setStep(1)}>Começar</AppButton>
            <Link to="/login">
              <AppButton variant="ghost" size="md" className="w-full">
                Já tenho conta
              </AppButton>
            </Link>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  const canNext =
    step === 1 || (step === 2 && reasons.length > 0) || (step === 3 && minutes !== null);

  return (
    <PhoneFrame>
      <div className="flex items-center gap-3 px-4 pt-4 safe-top">
        <button
          onClick={() => setStep(step - 1)}
          aria-label="Voltar"
          className="grid size-10 place-items-center rounded-full text-muted-foreground"
        >
          <ArrowLeft />
        </button>
        <ProgressBar value={(step / 4) * 100} />
      </div>
      <div key={step} className="animate-rise flex flex-1 flex-col px-5 pt-6">
        {step === 1 && (
          <>
            <h1 className="font-display text-2xl font-bold">Qual língua queres aprender?</h1>
            <div className="mt-6 space-y-6">
              {countries?.map((c) => (
                <section key={c.id} aria-label={c.name}>
                  <h2 className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {c.name}
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
                                Disponível
                              </span>
                            ) : preview ? (
                              <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
                                Testar · rascunho
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
        {step === 2 && (
          <>
            <h1 className="font-display text-2xl font-bold">Porque queres aprender?</h1>
            <p className="mt-1 text-sm text-muted-foreground">Podes escolher mais do que uma.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {REASONS.map((r, i) => {
                const on = reasons.includes(r);
                return (
                  <button
                    key={r}
                    onClick={() =>
                      setReasons(on ? reasons.filter((x) => x !== r) : [...reasons, r])
                    }
                    aria-pressed={on}
                    className={cn(
                      "pressable relative flex flex-col items-start gap-2 rounded-3xl border-[1.5px] p-4 text-left font-bold",
                      on ? "border-primary bg-primary/5" : "border-border bg-surface",
                    )}
                  >
                    <span className="text-3xl">{REASON_ICONS[i]}</span>
                    {r}
                    {on && (
                      <Check className="absolute right-3 top-3 size-5 rounded-full bg-primary p-0.5 text-primary-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h1 className="font-display text-2xl font-bold">
              Quanto tempo queres praticar por dia?
            </h1>
            <div className="mt-6 space-y-3">
              {MINUTES.map(({ m, l }) => (
                <button
                  key={m}
                  onClick={() => setMinutes(m)}
                  aria-pressed={minutes === m}
                  className={cn(
                    "pressable flex w-full items-center justify-between rounded-2xl border-[1.5px] p-4 font-bold",
                    minutes === m ? "border-primary bg-primary/5" : "border-border bg-surface",
                  )}
                >
                  <span>{m} minutos</span>
                  <span className="text-sm text-muted-foreground">{l}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {step === 4 && <Register onDone={() => navigate({ to: "/learn" })} />}
        {step < 4 && (
          <div className="mt-auto pb-6 pt-6 safe-bottom">
            <AppButton disabled={!canNext} onClick={() => setStep(step + 1)}>
              Continuar
            </AppButton>
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}

function Register({ onDone }: { onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    await authService.signUp({
      name: String(f.get("name")),
      username: String(f.get("username")),
      email: String(f.get("email")),
      password: String(f.get("password")),
    });
    onDone();
  };
  return (
    <form onSubmit={submit} className="flex flex-1 flex-col">
      <h1 className="font-display text-2xl font-bold">Cria a tua conta</h1>
      <div className="mt-6 space-y-3">
        <Field name="name" label="Nome" />
        <Field name="username" label="Username" />
        <Field name="email" label="Email" type="email" />
        <Field name="password" label="Password" type="password" />
      </div>
      <div className="mt-auto space-y-3 pb-6 pt-6 safe-bottom">
        <AppButton type="submit" disabled={loading}>
          {loading ? "A criar…" : "Criar conta"}
        </AppButton>
        <AppButton type="button" variant="secondary" onClick={onDone}>
          <GoogleG />
          Continuar com Google
        </AppButton>
        <Link to="/login" className="block text-center text-sm font-bold text-primary">
          Já tenho conta
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
