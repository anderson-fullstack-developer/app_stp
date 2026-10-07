import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAdminDB } from "@/services/admin";
import type { AdminMatch, MatchMode } from "@/admin/types";
import {
  BarChart,
  DataTable,
  Drawer,
  FilterBar,
  Kpi,
  PageHeader,
  Panel,
  Select,
  StatusBadge,
  fmtDateTime,
  type Column,
} from "@/admin/ui";
import { adminGameService } from "@/services/admin";

export const Route = createFileRoute("/admin/multiplayer")({
  head: () => ({
    meta: [
      { title: "Multiplayer — Admin Língua STP" },
      { name: "description", content: "Partidas, modos e histórico do multiplayer." },
    ],
  }),
  component: Multiplayer,
});

function Multiplayer() {
  const db = useAdminDB();
  const [live, setLive] = useState<Awaited<ReturnType<typeof adminGameService.live>> | null>(null);
  const [mode, setMode] = useState<"Todos" | MatchMode>("Todos");
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => {
    adminGameService.live().then(setLive);
  }, []);
  const rows = db.matches.filter((m) => mode === "Todos" || m.mode === mode);
  const modes: MatchMode[] = ["Sobrevivência", "1v1", "2v2", "Sala Privada"];
  const columns: Column<AdminMatch>[] = [
    {
      key: "id",
      header: "Game ID",
      cell: (m) => <span className="font-mono text-xs">{m.id}</span>,
    },
    { key: "mo", header: "Modo", cell: (m) => m.mode },
    { key: "st", header: "Estado", cell: (m) => <StatusBadge status={m.state} /> },
    { key: "p", header: "Jogadores", cell: (m) => m.players.length },
    { key: "w", header: "Vencedor", cell: (m) => `@${m.winner}` },
    { key: "d", header: "Data", cell: (m) => fmtDateTime(m.date) },
  ];
  const open = db.matches.find((m) => m.id === openId);
  return (
    <>
      <PageHeader
        title="Multiplayer"
        description="Dados simulados. Futuramente via Socket.IO + Redis."
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Jogadores online" value={live?.online ?? "—"} />
        <Kpi label="Partidas ativas" value={live?.active ?? "—"} />
        <Kpi label="Partidas hoje" value={live?.today ?? "—"} />
        <Kpi label="Tempo médio" value={live ? `${live.avgMinutes} min` : "—"} />
        <Kpi label="Taxa de abandono" value={live ? `${live.abandonRate}%` : "—"} tone="down" />
      </div>
      <Panel title="Partidas por modo" className="my-4">
        <BarChart
          data={modes.map((m) => ({
            label: m,
            value: db.matches.filter((x) => x.mode === m).length,
          }))}
          height={120}
        />
      </Panel>
      <FilterBar>
        <Select value={mode} onChange={setMode} options={["Todos", ...modes]} />
      </FilterBar>
      <DataTable rows={rows} columns={columns} onRowClick={(m) => setOpenId(m.id)} />
      {open && (
        <Drawer open onClose={() => setOpenId(null)} title={`Partida ${open.id}`} wide>
          <div className="grid grid-cols-4 gap-2 text-sm">
            <Kpi label="Modo" value={<span className="text-base">{open.mode}</span>} />
            <Kpi label="Estado" value={<StatusBadge status={open.state} />} />
            <Kpi label="Data" value={<span className="text-base">{fmtDateTime(open.date)}</span>} />
            <Kpi label="Vencedor" value={<span className="text-base">@{open.winner}</span>} />
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  {[
                    "Pos.",
                    "Jogador",
                    "Vidas",
                    "Certas",
                    "Erradas",
                    "Tempo médio",
                    "XP",
                    "Moedas",
                  ].map((h) => (
                    <th key={h} className="px-3 py-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {open.players.map((p) => (
                  <tr key={p.username} className="border-t">
                    <td className="px-3 py-2 font-semibold">{p.place}.º</td>
                    <td className="px-3 py-2">@{p.username}</td>
                    <td className="px-3 py-2">{"❤️".repeat(p.lives) || "—"}</td>
                    <td className="px-3 py-2">{p.correct}</td>
                    <td className="px-3 py-2">{p.wrong}</td>
                    <td className="px-3 py-2">{(p.avgMs / 1000).toFixed(1)}s</td>
                    <td className="px-3 py-2">+{p.xp}</td>
                    <td className="px-3 py-2">+{p.coins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Valores de XP e moedas são placeholders configuráveis em Regras e Configurações.
          </p>
        </Drawer>
      )}
    </>
  );
}
