import { createFileRoute } from "@tanstack/react-router";
import { Ban } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAdminDB } from "@/services/admin";
import { Btn, Field, PageHeader, Panel, TextInput } from "@/admin/ui";
import { Switch } from "@/components/ui/switch";
import { adminRewardService } from "@/services/admin";

export const Route = createFileRoute("/admin/ads")({
  head: () => ({ meta: [{ title: "Anúncios — Admin Língua STP" }, { name: "description", content: "Locais permitidos para publicidade (futuro AdMob)." }] }),
  component: Ads,
});

const NEVER = ["Perguntas", "Lição ativa", "Matchmaking", "Partida multiplayer", "Countdown"];

function Ads() {
  const db = useAdminDB();
  const [ads, setAds] = useState(db.ads);
  return (
    <>
      <PageHeader title="Anúncios" description="Configuração visual. Futuramente servida por AdMob." actions={<Btn onClick={() => { adminRewardService.saveAds(ads); toast.success("Configuração guardada"); }}>Guardar</Btn>} />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Panel title="Locais possíveis">
          <ul className="divide-y">
            {ads.map((a, i) => (
              <li key={a.id} className="flex items-center gap-4 py-3">
                <Switch checked={a.enabled} onCheckedChange={(v) => setAds(ads.map((x, j) => (j === i ? { ...x, enabled: v } : x)))} aria-label={a.label} />
                <span className="flex-1 font-medium">{a.label}</span>
                {a.id === "after_activities" && <Field label="A cada N atividades" className="w-40"><TextInput type="number" min={1} value={a.frequency} onChange={(e) => setAds(ads.map((x, j) => (j === i ? { ...x, frequency: Number(e.target.value) } : x)))} /></Field>}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Regra fixa — nunca durante">
          <ul className="space-y-2">{NEVER.map((n) => <li key={n} className="flex items-center gap-2 text-sm"><Ban className="size-4 text-destructive" />{n}</li>)}</ul>
          <p className="mt-3 text-xs text-muted-foreground">Esta regra não é configurável.</p>
        </Panel>
      </div>
    </>
  );
}
