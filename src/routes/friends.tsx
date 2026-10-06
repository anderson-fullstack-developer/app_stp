import { createFileRoute } from "@tanstack/react-router";
import { Search, UserPlus } from "lucide-react";
import { useState } from "react";
import { AppButton } from "@/components/app/Buttons";
import { UserCard } from "@/components/app/Cards";
import { EmptyState, LoadingState, Modal, Tabs } from "@/components/app/Primitives";
import { useFriends } from "@/hooks/use-service";
import { AppHeader, TabLayout } from "@/layouts/AppShell";
import { friendService } from "@/services";

export const Route = createFileRoute("/friends")({
  head: () => ({
    meta: [
      { title: "Amigos — Língua STP" },
      { name: "description", content: "Encontra amigos, aceita pedidos e desafia-os." },
      { property: "og:title", content: "Amigos — Língua STP" },
      { property: "og:description", content: "Aprende e compete com amigos." },
    ],
  }),
  component: Friends,
});

type Tab = "friend" | "request" | "suggestion";

function Friends() {
  const { data, isLoading } = useFriends();
  const [tab, setTab] = useState<Tab>("friend");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [sent, setSent] = useState(false);
  const all = data ?? [];
  const list = all.filter((f) => f.status === tab && (f.name.toLowerCase().includes(q.toLowerCase()) || f.username.includes(q.toLowerCase())));
  const count = (t: Tab) => all.filter((f) => f.status === t).length;

  return (
    <TabLayout header={<AppHeader title="Amigos" right={<button onClick={() => setAdding(true)} aria-label="Adicionar amigo" className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground"><UserPlus className="size-5" /></button>} />}>
      <label className="flex h-12 items-center gap-2 rounded-2xl border-2 border-border bg-surface px-4 focus-within:border-primary">
        <Search className="size-5 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar utilizadores" className="flex-1 bg-transparent font-semibold outline-none" aria-label="Pesquisar utilizadores" />
      </label>
      <div className="mt-3">
        <Tabs value={tab} onChange={setTab} items={[
          { value: "friend", label: `Amigos ${count("friend")}` },
          { value: "request", label: `Pedidos ${count("request")}` },
          { value: "suggestion", label: "Descobrir" },
        ]} />
      </div>
      <div className="mt-4 space-y-3">
        {isLoading ? <LoadingState /> : list.length === 0
          ? <EmptyState title={tab === "request" ? "Sem pedidos" : "Ninguém encontrado"} text="Convida amigos para aprender contigo." />
          : list.map((f) => <UserCard key={f.id} friend={f} />)}
      </div>
      <div className="mt-5"><AppButton variant="secondary" onClick={() => setAdding(true)}><UserPlus className="size-5" />Adicionar amigo</AppButton></div>
      <Modal open={adding} onClose={() => { setAdding(false); setSent(false); }}>
        {sent ? (
          <p className="py-4 text-center font-display text-xl font-extrabold">Pedido enviado ✓</p>
        ) : (
          <form onSubmit={async (e) => { e.preventDefault(); await friendService.sendRequest(String(new FormData(e.currentTarget).get("u"))); setSent(true); }}>
            <p className="font-display text-xl font-extrabold">Adicionar amigo</p>
            <input name="u" required placeholder="@username" className="mt-4 h-12 w-full rounded-2xl border-2 border-border bg-background px-4 font-semibold outline-none focus:border-primary" />
            <AppButton className="mt-4" type="submit">Enviar pedido</AppButton>
          </form>
        )}
      </Modal>
    </TabLayout>
  );
}
