import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAdminDB } from "@/services/admin";
import type { PremiumProduct } from "@/admin/types";
import { Btn, Field, PageHeader, Panel, Select, TextArea, TextInput } from "@/admin/ui";
import { adminRewardService } from "@/services/admin";

export const Route = createFileRoute("/admin/premium")({
  head: () => ({ meta: [{ title: "Premium — Admin Língua STP" }, { name: "description", content: "Produtos Premium (futuro RevenueCat + Google Play Billing)." }] }),
  component: Premium,
});

function Premium() {
  const db = useAdminDB();
  return (
    <>
      <PageHeader title="Premium" description="Sem pagamentos reais. Os produtos virão do RevenueCat + Google Play Billing. Premium nunca dá vantagem competitiva." />
      <div className="grid gap-4 lg:grid-cols-2">{db.premium.map((p) => <ProductCard key={p.id} p={p} />)}</div>
    </>
  );
}

function ProductCard({ p }: { p: PremiumProduct }) {
  const [f, setF] = useState(p);
  return (
    <Panel title={p.name} actions={<Btn size="sm" onClick={() => { adminRewardService.savePremium(f); toast.success("Produto guardado"); }}>Guardar</Btn>}>
      <div className="space-y-3">
        <Field label="Nome"><TextInput value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Preço exibido" hint="Provisório. O preço real vem da loja."><TextInput value={f.displayPrice} onChange={(e) => setF({ ...f, displayPrice: e.target.value })} /></Field>
        <Field label="Benefícios (um por linha)"><TextArea rows={4} value={f.benefits.join("\n")} onChange={(e) => setF({ ...f, benefits: e.target.value.split("\n") })} /></Field>
        <Field label="Status"><Select<PremiumProduct["status"]> value={f.status} onChange={(v) => setF({ ...f, status: v })} options={["ATIVO", "INATIVO"]} /></Field>
      </div>
    </Panel>
  );
}
