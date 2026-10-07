import { isFeatureOn, APP_NAME } from "@stp/config";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, BarChart3, GraduationCap, School, Users } from "lucide-react";
import { BackButton } from "@/components/app/BackButton";
import { SoonBadge } from "@/components/app/Badges";
import { AppButton } from "@/components/app/Buttons";
import { AppHeader, PhoneFrame } from "@/layouts/AppShell";

export const Route = createFileRoute("/schools")({
  head: () => ({
    meta: [
      { title: `Para Escolas — ${APP_NAME}` },
      { name: "description", content: "Professores, turmas e progresso dos alunos. Em breve." },
      { property: "og:title", content: `Para Escolas — ${APP_NAME}` },
      { property: "og:description", content: "Leva as línguas de STP para a sala de aula." },
    ],
  }),
  component: Schools,
});

const STEPS = [
  {
    icon: GraduationCap,
    t: "Professor",
    d: "Cria a conta da escola",
    cls: "bg-forest text-primary-foreground",
  },
  {
    icon: School,
    t: "Turma",
    d: "Organiza alunos por turma",
    cls: "bg-ocean-grad text-ocean-foreground",
  },
  { icon: Users, t: "Alunos", d: "Entram com um código", cls: "bg-sun text-accent-foreground" },
  {
    icon: BarChart3,
    t: "Progresso",
    d: "Acompanha lições e precisão",
    cls: "bg-coral text-destructive-foreground",
  },
];

function Schools() {
  return (
    <PhoneFrame>
      <AppHeader
        left={<BackButton />}
        title="Para Escolas"
        right={isFeatureOn("schoolMode") ? undefined : <SoonBadge />}
      />
      <main className="flex-1 px-5 pb-8">
        <h1 className="font-display text-2xl font-bold">
          Leva as línguas de São Tomé e Príncipe para a sala de aula
        </h1>
        <div className="mt-6 flex flex-col items-center">
          {STEPS.map(({ icon: I, t, d, cls }, i) => (
            <div key={t} className="flex w-full flex-col items-center">
              <div className="flex w-full items-center gap-4 rounded-3xl card p-4">
                <div className={`grid size-12 place-items-center rounded-2xl ${cls}`}>
                  <I />
                </div>
                <div>
                  <p className="font-display font-bold">{t}</p>
                  <p className="text-xs text-muted-foreground">{d}</p>
                </div>
              </div>
              {i < STEPS.length - 1 && <ArrowDown className="my-2 size-5 text-muted-foreground" />}
            </div>
          ))}
        </div>
        <AppButton className="mt-8" variant="secondary" disabled>
          Pedir demonstração
        </AppButton>
      </main>
    </PhoneFrame>
  );
}
