import { useBlockAds } from "@/config/ads";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { KeyRound, Plus, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BackButton } from "@/components/app/BackButton";
import { Avatar } from "@/components/app/Badges";
import { AppButton } from "@/components/app/Buttons";
import { LoadingState, Modal, SectionTitle } from "@/components/app/Primitives";
import { LobbyPlayer, OptionPicker, RoomCode } from "@/components/play/LobbyUI";
import { MULTIPLAYER_CONFIG } from "@stp/config";
import { listInvitableFriends } from "@/services/game.service";
import { AppHeader, PhoneFrame } from "@/layouts/AppShell";
import { session } from "@/lib/multiplayer/session-store";
import { multiplayerService } from "@/services/game.service";
import type { LobbyMember, MatchConfig, PrivateRoom, RoomMode } from "@stp/types/multiplayer";

export const Route = createFileRoute("/play/private")({
  validateSearch: (s: Record<string, unknown>): { code?: string } => (typeof s["code"] === "string" ? { code: s["code"] } : {}),
  head: () => ({
    meta: [
      { title: "Sala Privada — Língua STP" },
      { name: "description", content: "Cria uma sala, convida amigos e configura jogadores, vidas e tempo." },
      { property: "og:title", content: "Sala Privada — Língua STP" },
      { property: "og:description", content: "Joga com os teus amigos." },
    ],
  }),
  component: PrivateRoomPage,
});

function PrivateRoomPage() {
  useBlockAds("multiplayer");
  const { code } = Route.useSearch();
  const [step, setStep] = useState<"choose" | "setup" | "lobby">(code ? "lobby" : "choose");
  const [mode, setMode] = useState<RoomMode>("survival");
  const [config, setConfig] = useState<MatchConfig>({ ...MULTIPLAYER_CONFIG.publicSurvival, players: 4 });
  const [room, setRoom] = useState<PrivateRoom | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (code) multiplayerService.joinPrivateRoom(code).then((r) => { if (r.ok) setRoom(r.room); });
  }, [code]);

  const create = async () => {
    setCreating(true);
    const r = await multiplayerService.createPrivateRoom(mode, mode === "teams" ? { ...config, players: 4 } : config);
    setRoom(r); setStep("lobby"); setCreating(false);
  };

  return (
    <PhoneFrame>
      <AppHeader left={<BackButton />} title="Sala privada" />
      {step === "choose" && (
        <main className="flex flex-1 flex-col gap-4 px-4 pb-6">
          <button type="button" onClick={() => setStep("setup")} className="pressable rounded-[1.75rem] bg-ocean-grad p-6 text-left text-ocean-foreground pattern-leaf">
            <Plus className="size-9" /><p className="mt-2 font-display text-2xl font-extrabold">Criar sala</p><p className="opacity-85">Tu és o host e escolhes as regras.</p>
          </button>
          <Link to="/play/join" className="pressable block rounded-[1.75rem] bg-cocoa p-6 text-secondary-foreground pattern-leaf">
            <KeyRound className="size-9" /><p className="mt-2 font-display text-2xl font-extrabold">Entrar com código</p><p className="opacity-85">Recebeste um código? Entra aqui.</p>
          </Link>
        </main>
      )}
      {step === "setup" && (
        <main className="flex flex-1 flex-col gap-5 px-4 pb-6">
          <OptionPicker label="Modo" value={mode} options={["survival", "teams"] as const} onChange={setMode} format={(v) => (v === "survival" ? "💀 Sobrevivência" : "👥 2 vs 2")} />
          {mode === "survival" && <OptionPicker label="Jogadores" value={config.players} options={MULTIPLAYER_CONFIG.playerOptions} onChange={(players) => setConfig({ ...config, players })} />}
          {mode === "survival" && <OptionPicker label="Vidas" value={config.lives} options={MULTIPLAYER_CONFIG.livesOptions} onChange={(lives) => setConfig({ ...config, lives })} format={(v) => `${v} ❤️`} />}
          <OptionPicker label="Tempo por pergunta" value={config.seconds} options={MULTIPLAYER_CONFIG.timeOptions} onChange={(seconds) => setConfig({ ...config, seconds })} format={(v) => `${v}s`} />
          <div className="mt-auto"><AppButton onClick={create} disabled={creating}>{creating ? "A criar…" : "Criar sala"}</AppButton></div>
        </main>
      )}
      {step === "lobby" && (room ? <Lobby room={room} /> : <main className="px-4"><LoadingState /></main>)}
    </PhoneFrame>
  );
}

function Lobby({ room }: { room: PrivateRoom }) {
  const navigate = useNavigate();
  const [members, setMembers] = useState<LobbyMember[]>(room.members);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invited, setInvited] = useState<string[]>([]);
  const ctl = useRef<ReturnType<typeof multiplayerService.watchLobby> | null>(null);
  const me = members.find((m) => m.isMe)!;
  const isHost = !!me?.isHost;
  const ready = members.filter((m) => m.ready).length;
  const needed = room.mode === "teams" ? 4 : 2;
  const canStart = isHost && members.length >= needed && ready === members.length;

  useEffect(() => {
    ctl.current = multiplayerService.watchLobby(room, setMembers);
    return () => ctl.current?.stop();
  }, [room]);

  const start = async () => {
    await multiplayerService.startGame(room.code);
    session.setPending({ source: "private", config: room.config, members });
    navigate({ to: room.mode === "teams" ? "/play/teams" : "/play/survival" });
  };

  // Guests: the (mock) host starts once everyone is ready.
  useEffect(() => {
    if (isHost || ready !== members.length || members.length < needed) return;
    const t = setTimeout(start, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, ready, members.length]);

  const host = members.find((m) => m.isHost);
  return (
    <>
      <main className="flex-1 px-4 pb-36">
        <RoomCode code={room.code} />
        <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm font-bold">
          <span className="rounded-xl bg-muted px-3 py-1">{room.mode === "survival" ? "💀 Sobrevivência" : "👥 2 vs 2"}</span>
          <span className="rounded-xl bg-muted px-3 py-1">{room.mode === "teams" ? 4 : room.config.players} jogadores</span>
          {room.mode === "survival" && <span className="rounded-xl bg-muted px-3 py-1">{room.config.lives} ❤️</span>}
          <span className="rounded-xl bg-muted px-3 py-1">{room.config.seconds}s</span>
        </div>
        <SectionTitle action={<span className="text-sm font-bold text-muted-foreground">{ready}/{members.length} prontos</span>}>Host: {host?.name}</SectionTitle>
        <div className="space-y-2">{members.map((m) => <LobbyPlayer key={m.id} m={m} />)}</div>
        {isHost && <AppButton variant="secondary" size="md" className="mt-3 w-full" onClick={() => setInviteOpen(true)}><UserPlus className="size-4" />Convidar amigos</AppButton>}
      </main>
      <div className="absolute inset-x-0 bottom-0 space-y-2 bg-background px-5 pt-3 pb-5 safe-bottom">
        {isHost ? (
          <AppButton onClick={start} disabled={!canStart}>{canStart ? "Começar partida" : members.length < needed ? `Faltam ${needed - members.length} jogadores` : "À espera que todos fiquem prontos"}</AppButton>
        ) : (
          <>
            <AppButton variant={me?.ready ? "secondary" : "primary"} onClick={() => ctl.current?.setReady(!me?.ready)}>{me?.ready ? "Não estou pronto" : "Estou pronto"}</AppButton>
            <p className="text-center text-sm font-semibold text-muted-foreground">À espera que o host comece…</p>
          </>
        )}
      </div>
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)}>
        <p className="mb-3 font-display text-xl font-extrabold">Convidar amigos</p>
        <div className="space-y-2">
          {listInvitableFriends().map((f) => (
            <div key={f.id} className="flex items-center gap-3">
              <Avatar name={f.name} color={f.avatarColor} size={36} />
              <span className="flex-1 font-bold">{f.name}</span>
              <AppButton size="sm" variant={invited.includes(f.id) ? "secondary" : "primary"} disabled={invited.includes(f.id)}
                onClick={() => { ctl.current?.invite(f.id); setInvited([...invited, f.id]); }}>{invited.includes(f.id) ? "Convidado" : "Convidar"}</AppButton>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
