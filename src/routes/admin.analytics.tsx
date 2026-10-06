import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAdminDB } from "@/services/admin";
import { BarChart, Kpi, LineChart, PageHeader, Panel } from "@/admin/ui";
import { adminAnalyticsService } from "@/services/admin";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Admin Língua STP" }, { name: "description", content: "Métricas de uso (futuro PostHog)." }] }),
  component: Analytics,
});

function Analytics() {
  const db = useAdminDB();
  const [a, setA] = useState<Awaited<ReturnType<typeof adminAnalyticsService.overview>> | null>(null);
  useEffect(() => { adminAnalyticsService.overview().then(setA); }, []);
  if (!a) return <p className="text-sm text-muted-foreground">A carregar…</p>;
  const hardest = db.exercises.slice(0, 5).map((e, i) => ({ q: e.question, rate: 62 - i * 7 }));
  const popular = db.lessons.slice(0, 5).map((l, i) => ({ t: `${db.units.find((u) => u.id === l.unitId)?.title} · ${l.title}`, n: 4200 - i * 530 }));
  return (
    <>
      <PageHeader title="Analytics" description="Dados mock. Futuramente PostHog." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Kpi label="DAU" value={a.dau.at(-1)} /><Kpi label="WAU" value={a.wau.at(-1)} /><Kpi label="MAU" value={a.mau.at(-1)} />
        <Kpi label="Streak médio" value={a.avgStreak} /><Kpi label="Lições / utilizador" value={a.lessonsPerUser} /><Kpi label="Conclusão de partidas" value={`${a.matchCompletion}%`} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="DAU"><LineChart data={a.dau} /></Panel>
        <Panel title="Retenção (%)"><BarChart data={a.retention.map((v, i) => ({ label: `D${i}`, value: v }))} suffix="%" /></Panel>
        <Panel title="Partidas por modo (%)"><BarChart data={a.byMode} suffix="%" /></Panel>
        <Panel title="Conversão Premium (%)"><LineChart data={a.premiumConversion} tone="accent" /></Panel>
        <Panel title="Perguntas com maior taxa de erro">
          <ul className="space-y-2 text-sm">{hardest.map((h) => <li key={h.q} className="flex justify-between gap-3"><span className="truncate">{h.q}</span><b className="text-destructive">{h.rate}%</b></li>)}</ul>
        </Panel>
        <Panel title="Lições mais populares">
          <ul className="space-y-2 text-sm">{popular.map((p) => <li key={p.t} className="flex justify-between gap-3"><span className="truncate">{p.t}</span><b>{p.n.toLocaleString("pt-PT")}</b></li>)}</ul>
        </Panel>
      </div>
    </>
  );
}
