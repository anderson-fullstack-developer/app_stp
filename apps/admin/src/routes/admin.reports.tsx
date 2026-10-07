import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAdminDB } from "@/services/admin";
import type { AdminReport, ReportStatus } from "@/admin/types";
import {
  Btn,
  DataTable,
  Drawer,
  FilterBar,
  PageHeader,
  Select,
  StatusBadge,
  type Column,
} from "@/admin/ui";
import { adminReportService } from "@/services/admin";
import { fmtDate } from "@/admin/format";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Denúncias — Admin Língua STP" },
      { name: "description", content: "Gestão de denúncias de utilizadores e conteúdo." },
    ],
  }),
  component: Reports,
});

function Reports() {
  const db = useAdminDB();
  const [status, setStatus] = useState("Todos");
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = db.reports.filter((r) => status === "Todos" || r.status === status);
  const columns: Column<AdminReport>[] = [
    { key: "t", header: "Tipo", cell: (r) => <span className="font-medium">{r.type}</span> },
    { key: "o", header: "Alvo", cell: (r) => r.target },
    { key: "r", header: "Denunciante", cell: (r) => r.reporter },
    { key: "s", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "d", header: "Data", cell: (r) => fmtDate(r.date) },
  ];
  const open = db.reports.find((r) => r.id === openId);
  const act = async (s: ReportStatus) => {
    if (!open) return;
    await adminReportService.setStatus(open.id, s);
    toast.success(`Denúncia: ${s}`);
  };
  return (
    <>
      <PageHeader title="Denúncias" />
      <FilterBar>
        <Select
          value={status}
          onChange={setStatus}
          options={["Todos", "OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"]}
        />
      </FilterBar>
      <DataTable rows={rows} columns={columns} onRowClick={(r) => setOpenId(r.id)} />
      {open && (
        <Drawer
          open
          onClose={() => setOpenId(null)}
          title={`${open.type} · ${open.target}`}
          footer={
            <>
              <Btn variant="outline" onClick={() => act("IN_REVIEW")}>
                Em análise
              </Btn>
              <Btn variant="ghost" onClick={() => act("DISMISSED")}>
                Descartar
              </Btn>
              <Btn onClick={() => act("RESOLVED")}>Resolver</Btn>
            </>
          }
        >
          <StatusBadge status={open.status} />
          <p className="text-sm">{open.description}</p>
          <p className="text-xs text-muted-foreground">
            Denunciado por {open.reporter} em {fmtDate(open.date)}
          </p>
        </Drawer>
      )}
    </>
  );
}
