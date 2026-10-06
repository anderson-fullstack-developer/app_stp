import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { BackButton } from "@/components/app/BackButton";
import { AppButton } from "@/components/app/Buttons";
import { RoomPlayer } from "@/components/app/Cards";
import { LoadingState, SectionTitle } from "@/components/app/Primitives";
import { useMe, useRoom } from "@/hooks/use-service";
import { AppHeader, PhoneFrame } from "@/layouts/AppShell";

export const Route = createFileRoute("/room")({
  // Legacy prototype screen, superseded by /play/private. Kept (not deleted) but redirected so there is one flow.
  beforeLoad: () => { throw redirect({ to: "/play/private", replace: true }); },
  head: () => ({
    meta: [
      { title: "Sala privada — Língua STP" },
      { name: "description", content: "Partilha o código e joga quizzes com amigos." },
      { property: "og:title", content: "Sala privada — Língua STP" },
      { property: "og:description", content: "Junta-te à sala e joga." },
    ],
  }),
  component: Room,
});

function Room() {
  const { data: room } = useRoom();
  const { data: me } = useMe();
  const [copied, setCopied] = useState(false);
  if (!room) return <PhoneFrame><LoadingState /></PhoneFrame>;
  const isHost = room.players.find((p) => p.isHost)?.id === me?.id;
  return (
    <PhoneFrame>
      <AppHeader left={<BackButton />} title="Sala" />
      <main className="flex-1 px-4 pb-32">
        <div className="rounded-[2rem] bg-ocean-grad p-6 text-center text-ocean-foreground pattern-leaf">
          <p className="text-xs font-bold uppercase tracking-widest opacity-80">Código da sala</p>
          <p className="mt-1 font-display text-5xl font-extrabold tracking-[0.15em]">{room.code}</p>
          <button onClick={() => { navigator.clipboard?.writeText(room.code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="pressable mx-auto mt-3 inline-flex items-center gap-1.5 rounded-xl bg-ocean-foreground/20 px-3 py-1.5 text-sm font-bold">
            {copied ? <><Check className="size-4" />Copiado</> : <><Copy className="size-4" />Copiar</>}
          </button>
        </div>
        <SectionTitle action={<span className="text-sm font-bold text-muted-foreground">{room.players.length}/{room.maxPlayers} jogadores</span>}>Jogadores</SectionTitle>
        <div className="space-y-2">{room.players.map((p) => <RoomPlayer key={p.id} p={p} />)}</div>
        <SectionTitle>Configurações</SectionTitle>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[`${room.questions} perguntas`, `${room.secondsPerQuestion} segundos`, "Modo normal"].map((s) => (
            <div key={s} className="rounded-2xl border-2 border-border bg-surface p-3 text-sm font-bold">{s}</div>
          ))}
        </div>
      </main>
      <div className="absolute inset-x-0 bottom-0 bg-background px-5 pt-3 safe-bottom pb-5">
        {isHost ? <Link to="/quiz"><AppButton>Começar jogo</AppButton></Link> : <AppButton disabled>À espera do host…</AppButton>}
      </div>
    </PhoneFrame>
  );
}
