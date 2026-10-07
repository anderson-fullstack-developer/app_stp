import { createFileRoute } from "@tanstack/react-router";
import { ROLE_LABEL } from "@/admin/permissions";
import { useAdminDB } from "@/services/admin";
import type { AuditEntry } from "@/admin/types";
import { DataTable, PageHeader, type Column } from "@/admin/ui";
import { fmtDateTime } from "@/admin/format";
import { APP_NAME } from "@stp/config";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({
    meta: [
      { title: `Audit Log — Admin ${APP_NAME}` },
      { name: "description", content: "Histórico de ações administrativas." },
    ],
  }),
  component: Audit,
});

function Audit() {
  const db = useAdminDB();
  const columns: Column<AuditEntry>[] = [
    { key: "a", header: "Admin", cell: (e) => <span className="font-medium">{e.admin}</span> },
    { key: "r", header: "Perfil", cell: (e) => ROLE_LABEL[e.role] },
    { key: "ac", header: "Ação", cell: (e) => e.action },
    { key: "o", header: "Objeto", cell: (e) => e.object },
    { key: "t", header: "Data/Hora", cell: (e) => fmtDateTime(e.at) },
  ];
  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Todas as ações feitas neste painel ficam registadas."
      />
      <DataTable rows={db.audit} columns={columns} pageSize={15} />
    </>
  );
}
