import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAdminDB } from "@/services/admin";
import { BarChart, Kpi, LineChart, PageHeader, Panel } from "@/admin/ui";
import { adminAnalyticsService } from "@/services/admin";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Admin Língua STP" },
      { name: "description", content: "Visão geral de utilizadores, conteúdo e multiplayer." },
    ],
  }),
  component: Dashboard,
});

type Overview = Awaited<ReturnType<typeof adminAnalyticsService.overview>>;

function Dashboard() {
  const db = useAdminDB();
  const [a, setA] = useState<Overview | null>(null);
  useEffect(() => {
    adminAnalyticsService.overview().then(setA);
  }, []);
  const pending = [...db.vocabulary, ...db.phrases, ...db.exercises].filter(
    (c) => c.status === "UNDER_REVIEW",
  ).length;
  const questions = db.exercises.filter((e) => e.status === "APPROVED").length;
  const n = (v: number) => v.toLocaleString("pt-PT");
  return (
    <>
      <PageHeader title="Dashboard" description="Dados de demonstração (mock)." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label="Utilizadores totais" value={n(12840)} hint="+4,2% semana" />
        <Kpi label="Ativos hoje" value={n(a?.dau.at(-1) ?? 0)} hint="+1,8%" />
        <Kpi label="Lições realizadas" value={n(48210)} />
        <Kpi label="XP ganho" value={n(3_912_400)} />
        <Kpi label="Streaks ativos" value={n(3120)} />
        <Kpi label="Partidas multiplayer" value={n(9480)} />
        <Kpi label="Premium ativos" value={n(386)} hint="3,0% conversão" />
        <Kpi
          label="A aguardar revisão"
          value={
            <Link
              to="/admin/review"
              search={{ status: "UNDER_REVIEW" }}
              className="text-primary hover:underline"
            >
              {pending}
            </Link>
          }
        />
        <Kpi label="Perguntas disponíveis" value={questions} />
        <Kpi
          label="Áudios disponíveis"
          value={db.audios.filter((x) => x.status === "APPROVED").length}
        />
      </div>
      {a && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <Panel title="DAU (14 dias)">
            <LineChart data={a.dau} />
          </Panel>
          <Panel title="WAU (8 semanas)">
            <LineChart data={a.wau} tone="ocean" />
          </Panel>
          <Panel title="MAU (6 meses)">
            <LineChart data={a.mau} tone="accent" />
          </Panel>
          <Panel title="Lições concluídas">
            <LineChart data={a.lessons} />
          </Panel>
          <Panel title="Partidas multiplayer">
            <LineChart data={a.matches} tone="ocean" />
          </Panel>
          <Panel title="Retenção (D0–D6, %)">
            <BarChart data={a.retention.map((v, i) => ({ label: `D${i}`, value: v }))} suffix="%" />
          </Panel>
          <Panel title="Conversão Premium (%)">
            <BarChart
              data={a.premiumConversion.map((v, i) => ({ label: `M${i + 1}`, value: v }))}
              suffix="%"
            />
          </Panel>
        </div>
      )}
    </>
  );
}
