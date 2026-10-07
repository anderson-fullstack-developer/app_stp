import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAdminDB } from "@/services/admin";
import type { AchievementType, AdminAchievement } from "@/admin/types";
import { Btn, Drawer, Field, PageHeader, Select, StatusBadge, TextInput } from "@/admin/ui";
import { adminRewardService } from "@/services/admin";

export const Route = createFileRoute("/admin/achievements")({
  head: () => ({
    meta: [
      { title: "Achievements — Admin Língua STP" },
      { name: "description", content: "Criar e gerir conquistas." },
    ],
  }),
  component: Achievements,
});

const TYPES: AchievementType[] = ["Lições", "Streak", "Respostas", "Vitórias", "Top 3", "Nível"];

function Achievements() {
  const db = useAdminDB();
  const [edit, setEdit] = useState<AdminAchievement | null>(null);
  return (
    <>
      <PageHeader
        title="Achievements"
        actions={
          <Btn
            onClick={() =>
              setEdit({
                id: `ac${Date.now()}`,
                name: "",
                description: "",
                icon: "🏅",
                type: "Lições",
                condition: 1,
                rewardXp: 0,
                rewardCoins: 0,
                status: "INATIVO",
              })
            }
          >
            <Plus className="size-4" />
            Novo achievement
          </Btn>
        }
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {db.achievements.map((a) => (
          <button
            type="button"
            key={a.id}
            onClick={() => setEdit(a)}
            className="rounded-xl border bg-surface p-4 text-left hover:border-primary"
          >
            <div className="flex items-start justify-between">
              <span className="text-3xl">{a.icon}</span>
              <StatusBadge status={a.status} />
            </div>
            <p className="mt-2 font-semibold">{a.name}</p>
            <p className="text-sm text-muted-foreground">{a.description}</p>
            <p className="mt-2 text-xs">
              {a.type} ≥ {a.condition} · +{a.rewardXp} XP · +{a.rewardCoins} moedas
            </p>
          </button>
        ))}
      </div>
      {edit && <AchDrawer key={edit.id} a={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function AchDrawer({ a, onClose }: { a: AdminAchievement; onClose: () => void }) {
  const [f, setF] = useState(a);
  const set = <K extends keyof AdminAchievement>(k: K, v: AdminAchievement[K]) =>
    setF({ ...f, [k]: v });
  return (
    <Drawer
      open
      onClose={onClose}
      title={a.name || "Novo achievement"}
      footer={
        <Btn
          disabled={!f.name}
          onClick={() => {
            adminRewardService.saveAchievement(f);
            toast.success("Guardado");
            onClose();
          }}
        >
          Guardar
        </Btn>
      }
    >
      <Field label="Nome">
        <TextInput value={f.name} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <Field label="Descrição">
        <TextInput value={f.description} onChange={(e) => set("description", e.target.value)} />
      </Field>
      <Field label="Ícone (emoji)">
        <TextInput value={f.icon} onChange={(e) => set("icon", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <Select value={f.type} onChange={(v) => set("type", v)} options={TYPES} />
        </Field>
        <Field label="Condição (valor)">
          <TextInput
            type="number"
            value={f.condition}
            onChange={(e) => set("condition", Number(e.target.value))}
          />
        </Field>
        <Field label="Recompensa XP">
          <TextInput
            type="number"
            value={f.rewardXp}
            onChange={(e) => set("rewardXp", Number(e.target.value))}
          />
        </Field>
        <Field label="Recompensa moedas">
          <TextInput
            type="number"
            value={f.rewardCoins}
            onChange={(e) => set("rewardCoins", Number(e.target.value))}
          />
        </Field>
      </div>
      <Field label="Status">
        <Select<AdminAchievement["status"]>
          value={f.status}
          onChange={(v) => set("status", v)}
          options={["ATIVO", "INATIVO"]}
        />
      </Field>
    </Drawer>
  );
}
