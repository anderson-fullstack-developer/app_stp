import { createFileRoute } from "@tanstack/react-router";
import { Plus, Wand2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAdminDB } from "@/services/admin";
import type { DailyChallenge } from "@/admin/types";
import { Btn, DataTable, Drawer, Field, PageHeader, Select, StatusBadge, TextInput, type Column } from "@/admin/ui";
import { cn } from "@/lib/utils";
import { adminRewardService } from "@/services/admin";

export const Route = createFileRoute("/admin/daily")({
  head: () => ({ meta: [{ title: "Desafio diário — Admin Língua STP" }, { name: "description", content: "Agendar desafios diários com perguntas aprovadas." }] }),
  component: Daily,
});

function Daily() {
  const db = useAdminDB();
  const [edit, setEdit] = useState<DailyChallenge | null>(null);
  const columns: Column<DailyChallenge>[] = [
    { key: "d", header: "Data", cell: (c) => <span className="font-medium">{c.date}</span> },
    { key: "q", header: "Perguntas", cell: (c) => c.exerciseIds.length },
    { key: "x", header: "XP", cell: (c) => `+${c.xp}` },
    { key: "m", header: "Moedas", cell: (c) => `+${c.coins}` },
    { key: "s", header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
  ];
  return (
    <>
      <PageHeader title="Desafio diário" description="Só perguntas APPROVED podem ser selecionadas."
        actions={<Btn onClick={() => setEdit({ id: `d${Date.now()}`, date: "2026-10-08", exerciseIds: [], xp: db.rewards.dailyXp, coins: db.rewards.dailyCoins, status: "RASCUNHO" })}><Plus className="size-4" />Novo desafio</Btn>} />
      <DataTable rows={db.daily} columns={columns} onRowClick={setEdit} />
      {edit && <DailyDrawer key={edit.id} c={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function DailyDrawer({ c, onClose }: { c: DailyChallenge; onClose: () => void }) {
  const db = useAdminDB();
  const [f, setF] = useState(c);
  const approved = db.exercises.filter((e) => e.status === "APPROVED");
  const toggle = (id: string) => setF({ ...f, exerciseIds: f.exerciseIds.includes(id) ? f.exerciseIds.filter((x) => x !== id) : [...f.exerciseIds, id] });
  return (
    <Drawer open onClose={onClose} title={`Desafio ${f.date}`} wide footer={<Btn onClick={() => { adminRewardService.saveDaily(f); toast.success("Desafio guardado"); onClose(); }}>Guardar</Btn>}>
      <div className="grid grid-cols-4 gap-3">
        <Field label="Data"><TextInput type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="XP"><TextInput type="number" value={f.xp} onChange={(e) => setF({ ...f, xp: Number(e.target.value) })} /></Field>
        <Field label="Moedas"><TextInput type="number" value={f.coins} onChange={(e) => setF({ ...f, coins: Number(e.target.value) })} /></Field>
        <Field label="Status"><Select<DailyChallenge["status"]> value={f.status} onChange={(v) => setF({ ...f, status: v })} options={["RASCUNHO", "AGENDADO", "ATIVO", "TERMINADO"]} /></Field>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Perguntas ({f.exerciseIds.length} selecionadas)</p>
        <Btn variant="outline" size="sm" onClick={() => setF({ ...f, exerciseIds: approved.slice(0, 5).map((e) => e.id) })} title="Futuramente automático"><Wand2 className="size-3.5" />Gerar automaticamente</Btn>
      </div>
      <ul className="space-y-1.5">
        {approved.map((e) => (
          <li key={e.id}><label className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm", f.exerciseIds.includes(e.id) && "border-primary bg-primary/5")}>
            <input type="checkbox" checked={f.exerciseIds.includes(e.id)} onChange={() => toggle(e.id)} className="accent-[var(--primary)]" />{e.question}
          </label></li>
        ))}
        {approved.length === 0 && <p className="text-sm text-muted-foreground">Sem perguntas aprovadas.</p>}
      </ul>
    </Drawer>
  );
}
