import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { adminAuth, resetDB, useAdminDB } from "@/services/admin";
import type { RewardRules } from "@/admin/types";
import { Btn, Field, PageHeader, Panel, TextInput } from "@/admin/ui";
import { adminRewardService } from "@/services/admin";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Regras e recompensas — Admin Língua STP" }, { name: "description", content: "Configuração de XP, moedas, vidas e tempos." }] }),
  component: Settings,
});

function Num({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return <Field label={label}><TextInput type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value))} /></Field>;
}

function Settings() {
  const db = useAdminDB();
  const [r, setR] = useState<RewardRules>(db.rewards);
  const set = <K extends keyof RewardRules>(k: K, v: RewardRules[K]) => setR({ ...r, [k]: v });
  return (
    <>
      <PageHeader title="Regras e recompensas" description="Valores provisórios (placeholders). No futuro são lidos da API, sem editar código."
        actions={<Btn onClick={async () => { await adminRewardService.save(r); toast.success("Regras guardadas"); }}>Guardar alterações</Btn>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Aprendizagem">
          <div className="grid grid-cols-2 gap-3">
            <Num label="XP por lição" value={r.lessonXp} onChange={(v) => set("lessonXp", v)} />
            <Num label="XP por resposta certa" value={r.answerXp} onChange={(v) => set("answerXp", v)} />
            <Num label="XP por desafio diário" value={r.dailyXp} onChange={(v) => set("dailyXp", v)} />
            <Num label="Moedas por lição" value={r.lessonCoins} onChange={(v) => set("lessonCoins", v)} />
            <Num label="Moedas por desafio diário" value={r.dailyCoins} onChange={(v) => set("dailyCoins", v)} />
          </div>
        </Panel>
        <Panel title="Multiplayer">
          <div className="grid grid-cols-2 gap-3">
            <Num label="XP multiplayer (vitória)" value={r.multiplayerXp} onChange={(v) => set("multiplayerXp", v)} />
            <Num label="Vidas iniciais" value={r.startingLives} onChange={(v) => set("startingLives", v)} />
            <Num label="Tempo por pergunta (s)" value={r.questionSeconds} onChange={(v) => set("questionSeconds", v)} />
            <Num label="Máximo de jogadores" value={r.maxPlayers} onChange={(v) => set("maxPlayers", v)} />
          </div>
        </Panel>
        <Panel title="Recompensas por posição (Sobrevivência)">
          <div className="space-y-2">
            {r.placeRewards.map((p, i) => (
              <div key={p.place} className="grid grid-cols-[60px_1fr_1fr] items-end gap-3">
                <span className="pb-2 font-semibold">{p.place}.º</span>
                <Num label="XP" value={p.xp} onChange={(v) => set("placeRewards", r.placeRewards.map((x, j) => (j === i ? { ...x, xp: v } : x)))} />
                <Num label="Moedas" value={p.coins} onChange={(v) => set("placeRewards", r.placeRewards.map((x, j) => (j === i ? { ...x, coins: v } : x)))} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Sessão e dados de demonstração">
          <div className="flex flex-wrap gap-2">
            <Btn variant="outline" onClick={() => { adminAuth.expire(); }}>Simular sessão expirada</Btn>
            <Btn variant="outline" onClick={() => { resetDB(); toast.success("Dados repostos"); }}>Repor dados de demonstração</Btn>
          </div>
        </Panel>
      </div>
    </>
  );
}
