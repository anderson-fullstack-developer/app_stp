import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { can } from "@/admin/permissions";
import { useAdminDB, useAdminSession } from "@/services/admin";
import type { AdminUser, UserStatus } from "@/admin/types";
import {
  Btn,
  Confirm,
  DataTable,
  Drawer,
  FilterBar,
  Kpi,
  PageHeader,
  StatusBadge,
  TextInput,
  type Column,
} from "@/admin/ui";
import { adminUserService } from "@/services/admin";
import { fmtDate } from "@/admin/format";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Utilizadores — Admin Língua STP" },
      { name: "description", content: "Gestão e moderação de utilizadores." },
    ],
  }),
  component: Users,
});

function Users() {
  const db = useAdminDB();
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = db.users.filter((u) => !q || `${u.username} ${u.email}`.includes(q.toLowerCase()));
  const columns: Column<AdminUser>[] = [
    {
      key: "u",
      header: "Username",
      cell: (u) => <span className="font-medium">@{u.username}</span>,
    },
    { key: "e", header: "Email", cell: (u) => u.email },
    { key: "l", header: "Nível", cell: (u) => u.level },
    { key: "x", header: "XP", cell: (u) => u.xp.toLocaleString("pt-PT") },
    { key: "s", header: "Streak", cell: (u) => `🔥 ${u.streak}` },
    { key: "p", header: "Premium", cell: (u) => (u.premium ? "Sim" : "—") },
    { key: "st", header: "Status", cell: (u) => <StatusBadge status={u.status} /> },
    { key: "c", header: "Criado", cell: (u) => fmtDate(u.createdAt) },
    { key: "a", header: "Última atividade", cell: (u) => fmtDate(u.lastActive) },
  ];
  const open = db.users.find((u) => u.id === openId);
  return (
    <>
      <PageHeader title="Utilizadores" />
      <FilterBar>
        <TextInput
          placeholder="Pesquisar username ou email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-72"
        />
      </FilterBar>
      <DataTable rows={rows} columns={columns} onRowClick={(u) => setOpenId(u.id)} />
      {open && <UserDrawer u={open} onClose={() => setOpenId(null)} />}
    </>
  );
}

function UserDrawer({ u, onClose }: { u: AdminUser; onClose: () => void }) {
  const session = useAdminSession();
  const [pending, setPending] = useState<UserStatus | null>(null);
  const mod = can(session?.role, "users.moderate");
  const labels: Record<UserStatus, string> = {
    ATIVO: "Reativar",
    SUSPENSO: "Suspender",
    BLOQUEADO: "Bloquear",
  };
  return (
    <Drawer
      open
      onClose={onClose}
      title={`@${u.username}`}
      wide
      footer={
        mod &&
        (["ATIVO", "SUSPENSO", "BLOQUEADO"] as UserStatus[])
          .filter((s) => s !== u.status)
          .map((s) => (
            <Btn
              key={s}
              variant={s === "ATIVO" ? "outline" : "danger"}
              onClick={() => setPending(s)}
            >
              {labels[s]}
            </Btn>
          ))
      }
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{u.email}</p>
        <StatusBadge status={u.status} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Kpi label="Nível" value={u.level} />
        <Kpi label="XP" value={u.xp.toLocaleString("pt-PT")} />
        <Kpi label="Moedas" value={u.coins} />
        <Kpi label="Streak" value={`🔥 ${u.streak}`} />
        <Kpi label="Amigos" value={u.friends} />
        <Kpi label="Partidas" value={u.matches} />
        <Kpi label="Achievements" value={u.achievements} />
        <Kpi label="Denúncias" value={u.reports} />
        <Kpi label="Premium" value={u.premium ? "Sim" : "Não"} />
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold text-muted-foreground">Progresso no curso</p>
        <div className="h-2.5 rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${u.progress}%` }} />
        </div>
        <p className="mt-1 text-xs">{u.progress}%</p>
      </div>
      <Confirm
        open={!!pending}
        title={`${pending ? labels[pending] : ""} @${u.username}?`}
        text="Esta ação administrativa fica registada no Audit Log."
        danger={pending !== "ATIVO"}
        confirmLabel={pending ? labels[pending] : ""}
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          if (pending) {
            await adminUserService.setStatus(u.id, pending);
            toast.success("Estado atualizado");
          }
          setPending(null);
        }}
      />
    </Drawer>
  );
}
