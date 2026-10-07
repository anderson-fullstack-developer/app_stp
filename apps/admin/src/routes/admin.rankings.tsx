import { createFileRoute } from "@tanstack/react-router";
import { useAdminDB } from "@/services/admin";
import type { AdminUser } from "@/admin/types";
import { DataTable, PageHeader, type Column } from "@/admin/ui";

export const Route = createFileRoute("/admin/rankings")({
  head: () => ({
    meta: [
      { title: "Rankings — Admin Língua STP" },
      { name: "description", content: "Classificação global por XP." },
    ],
  }),
  component: Rankings,
});

function Rankings() {
  const db = useAdminDB();
  const rows = [...db.users].sort((a, b) => b.xp - a.xp).map((u, i) => ({ ...u, rank: i + 1 }));
  const columns: Column<AdminUser & { rank: number }>[] = [
    { key: "r", header: "#", cell: (u) => <b>{u.rank}</b> },
    { key: "u", header: "Utilizador", cell: (u) => `@${u.username}` },
    { key: "x", header: "XP", cell: (u) => u.xp.toLocaleString("pt-PT") },
    { key: "l", header: "Nível", cell: (u) => u.level },
    { key: "m", header: "Partidas", cell: (u) => u.matches },
  ];
  return (
    <>
      <PageHeader title="Rankings" description="Ranking global (mock)." />
      <DataTable rows={rows} columns={columns} pageSize={15} />
    </>
  );
}
