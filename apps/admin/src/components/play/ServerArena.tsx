/**
 * Arena com o servidor em tempo real: criar/entrar numa sala, sala de espera e partida de
 * Sobrevivência. Os ecrãs só mostram o que o servidor envia e mandam a opção escolhida.
 */
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { MULTIPLAYER_CONFIG } from "@stp/config";
import type { ArenaConfigDto, ArenaRoomDto } from "@stp/types/arena";
import type { LobbyMember, QuizQuestion, SurvivalPlayer } from "@stp/types/multiplayer";
import { KeyRound, LogOut, Plus, UserPlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BackButton } from "@/components/app/BackButton";
import { AppButton } from "@/components/app/Buttons";
import { Avatar } from "@/components/app/Badges";
import { LoadingState, Modal, SectionTitle } from "@/components/app/Primitives";
import { useNow } from "@/components/play/arena-hooks";
import { LobbyPlayer, MatchmakingScreen, OptionPicker, RoomCode } from "@/components/play/LobbyUI";
import {
  AnswerFeedback,
  CountdownOverlay,
  FinalBattle,
  LivesIndicator,
  MatchTopBar,
  PlayerEliminatedOverlay,
  PlayersPanel,
  QuestionCard,
  QuizOption,
  RoundResult,
  WinnerOverlay,
  type OptionState,
} from "@/components/play/MatchUI";
import { useJoinSounds } from "@/hooks/use-join-sounds";
import { AppHeader, PhoneFrame } from "@/layouts/AppShell";
import { QuestionSpeakButton } from "@/components/app/SpeakButton";
import { RevealPronunciation } from "@/components/play/RevealPronunciation";
import { avatarColor } from "@/lib/avatar";
import { KRIOLU_LANGUAGE_ID } from "@/lib/kriolu-course";
import { arena, type ArenaState, useArena } from "@/lib/multiplayer/arena-client";
import { session } from "@/lib/multiplayer/session-store";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { socialApi, socialKeys } from "@/services/social-api.service";

const ERROR_TEXT: Record<string, string> = {
  ROOM_NOT_FOUND: "Não existe nenhuma sala com esse código.",
  ROOM_FULL: "A sala está cheia.",
  ROOM_STARTED: "A partida já começou.",
  IN_MATCH: "Estás a meio de uma partida.",
  NOT_READY: "Ainda há jogadores que não estão prontos.",
  NOT_ENOUGH_PLAYERS: "São precisos pelo menos 2 jogadores.",
  NO_QUESTIONS: "Ainda não há perguntas suficientes nesta língua.",
  LANGUAGE_NOT_AVAILABLE: "Esta língua ainda não está disponível.",
  TEAM_FULL: "Essa equipa já tem 2 jogadores.",
  TEAMS_INCOMPLETE: "São precisas 2 pessoas em cada equipa.",
  OFFLINE: "Sem ligação ao servidor da Arena.",
  NOT_FRIENDS: "Só podes convidar amigos.",
  ALREADY_IN_ROOM: "Já está na sala.",
  TOO_MANY_INVITES: "Já enviaste convites suficientes.",
};
/** Última partida cujo resultado já foi mostrado (para não o repetir). */
let shownMatchId: string | null = null;

const errorText = (r: { code: string; message: string }) => ERROR_TEXT[r.code] ?? r.message;

function ConnectionNote({ s }: { s: ArenaState }) {
  if (s.status === "ready" || s.status === "idle") return null;
  return (
    <p className="mx-4 mb-3 rounded-2xl bg-muted px-4 py-2 text-center text-sm font-semibold text-muted-foreground">
      {s.status === "connecting"
        ? "A ligar ao servidor da Arena…"
        : s.status === "unauthorized"
          ? "Sessão expirada. Entra outra vez."
          : "Sem ligação. A tentar de novo…"}
    </p>
  );
}

const lobbyMembers = (room: ArenaRoomDto, me: string | null): LobbyMember[] =>
  room.members.map((m) => ({
    id: m.userId,
    name: m.connected ? m.name : `${m.name} (desligado)`,
    color: avatarColor(m.avatarColor),
    isHost: m.isHost,
    isMe: m.userId === me,
    ready: m.ready,
  }));

/* -------------------------------- Sala privada -------------------------------- */

export function ServerPrivateRoom({
  code,
  mode: initialMode,
}: {
  code?: string | undefined;
  /** Veio do cartão "2 contra 2": abre a criação de sala já nesse modo. */
  mode?: "teams" | undefined;
}) {
  const s = useArena(true);
  const navigate = useNavigate();
  const [step, setStep] = useState<"choose" | "setup">(initialMode ? "setup" : "choose");
  const [config, setConfig] = useState<ArenaConfigDto>({
    ...MULTIPLAYER_CONFIG.publicSurvival,
    players: 4,
  });
  const [mode, setMode] = useState<"survival" | "teams">(initialMode ?? "survival");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triedCode = useRef<string | null>(null);

  // Duelos têm ecrã próprio; nos outros modos, quando a partida começa, vai para o jogo.
  useEffect(() => {
    if (s.room?.mode === "duel") navigate({ to: "/play/duel" });
    else if (s.match && s.match.phase !== "finished") {
      navigate({ to: s.room?.mode === "teams" ? "/play/teams" : "/play/survival" });
    }
  }, [s.room?.mode, s.match, navigate]);

  // Veio de um convite (?code=…): entra sozinho, uma vez.
  useEffect(() => {
    if (!code || s.status !== "ready" || s.room?.code === code || triedCode.current === code) {
      return;
    }
    triedCode.current = code;
    void arena.join(code).then((r) => {
      if (!r.ok) setError(errorText(r));
    });
  }, [code, s.status, s.room?.code]);

  const create = async () => {
    setBusy(true);
    setError(null);
    const r = await arena.create(config, mode);
    if (!r.ok) setError(errorText(r));
    setBusy(false);
  };

  return (
    <PhoneFrame>
      <AppHeader left={<BackButton />} title="Sala privada" />
      <ConnectionNote s={s} />
      {s.invite && s.invite.code !== s.room?.code && (
        <InviteBanner
          name={s.invite.from.name}
          duel={s.invite.mode === "duel"}
          onJoin={() => {
            const c = s.invite!.code;
            arena.dismissInvite();
            void arena.join(c).then((r) => {
              if (!r.ok) setError(errorText(r));
            });
          }}
          onDismiss={arena.dismissInvite}
        />
      )}
      {error && !s.room && step === "choose" && (
        <p className="mx-4 mb-3 text-center font-bold text-destructive">{error}</p>
      )}
      {s.room ? (
        <ServerLobby room={s.room} me={s.me} />
      ) : step === "choose" ? (
        <main className="flex flex-1 flex-col gap-4 px-4 pb-6">
          <button
            type="button"
            onClick={() => setStep("setup")}
            className="pressable rounded-[1.75rem] bg-ocean-grad p-6 text-left text-ocean-foreground pattern-leaf"
          >
            <Plus className="size-9" />
            <p className="mt-2 font-display text-2xl font-bold">Criar sala</p>
            <p className="opacity-85">Tu és o host e escolhes as regras.</p>
          </button>
          <Link
            to="/play/join"
            className="pressable block rounded-[1.75rem] bg-cocoa p-6 text-secondary-foreground pattern-leaf"
          >
            <KeyRound className="size-9" />
            <p className="mt-2 font-display text-2xl font-bold">Entrar com código</p>
            <p className="opacity-85">Recebeste um código? Entra aqui.</p>
          </Link>
          {s.closed && (
            <p className="text-center text-sm font-semibold text-muted-foreground">
              A sala anterior foi fechada.
            </p>
          )}
        </main>
      ) : (
        <main className="flex flex-1 flex-col gap-5 px-4 pb-6">
          <OptionPicker
            label="Modo"
            value={mode}
            options={["survival", "teams"] as const}
            onChange={setMode}
            format={(v) => (v === "survival" ? "💀 Sobrevivência" : "👥 2 contra 2")}
          />
          <p className="rounded-2xl bg-muted px-4 py-3 text-sm font-semibold">
            {mode === "survival"
              ? "Todos respondem à mesma pergunta; errar tira uma vida; o último a sobreviver ganha."
              : `Duas equipas de 2. São ${MULTIPLAYER_CONFIG.teams.questions} perguntas; cada certa vale pontos (mais se for rápida) e a equipa soma os dos dois.`}
          </p>
          {mode === "survival" && (
            <>
              <OptionPicker
                label="Jogadores (máximo)"
                value={config.players}
                options={MULTIPLAYER_CONFIG.playerOptions}
                onChange={(players) => setConfig({ ...config, players })}
              />
              <OptionPicker
                label="Vidas"
                value={config.lives}
                options={MULTIPLAYER_CONFIG.livesOptions}
                onChange={(lives) => setConfig({ ...config, lives })}
                format={(v) => `${v} ❤️`}
              />
              <OptionPicker
                label="Tempo por pergunta"
                value={config.seconds}
                options={MULTIPLAYER_CONFIG.timeOptions}
                onChange={(seconds) => setConfig({ ...config, seconds })}
                format={(v) => `${v}s`}
              />
            </>
          )}
          {error && <p className="text-center font-bold text-destructive">{error}</p>}
          <div className="mt-auto">
            <AppButton onClick={create} disabled={busy || s.status !== "ready"}>
              {busy ? "A criar…" : "Criar sala"}
            </AppButton>
          </div>
        </main>
      )}
    </PhoneFrame>
  );
}

function ServerLobby({ room, me }: { room: ArenaRoomDto; me: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const members = lobbyMembers(room, me);
  const mine = members.find((m) => m.isMe);
  const isHost = room.hostId === me;
  const connected = room.members.filter((m) => m.connected);
  const ready = connected.filter((m) => m.ready).length;
  const teams = room.mode === "teams";
  const inTeam = (t: "A" | "B") => room.members.filter((m) => m.team === t);
  const teamsReady = !teams || (inTeam("A").length === 2 && inTeam("B").length === 2);
  const canStart =
    isHost &&
    connected.length >= 2 &&
    ready === connected.length &&
    teamsReady &&
    room.status === "WAITING";
  const myTeam = room.members.find((m) => m.userId === me)?.team ?? null;
  useJoinSounds(members.length, members.length >= room.config.players);

  const run = async (fn: () => Promise<{ ok: boolean; code?: string; message?: string }>) => {
    setBusy(true);
    setError(null);
    const r = await fn();
    if (!r.ok) setError(errorText(r as { code: string; message: string }));
    setBusy(false);
  };

  return (
    <>
      <main className="flex-1 px-4 pb-40">
        <RoomCode code={room.code} />
        <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm font-bold">
          <span className="rounded-xl bg-muted px-3 py-1">
            {teams ? "👥 2 contra 2" : "💀 Sobrevivência"}
          </span>
          <span className="rounded-xl bg-muted px-3 py-1">
            {teams ? "4 jogadores" : `até ${room.config.players} jogadores`}
          </span>
          {!teams && <span className="rounded-xl bg-muted px-3 py-1">{room.config.lives} ❤️</span>}
          <span className="rounded-xl bg-muted px-3 py-1">{room.config.seconds}s</span>
          {room.languageId === KRIOLU_LANGUAGE_ID && (
            <span className="rounded-xl bg-accent/30 px-3 py-1">Kriolu · Beta</span>
          )}
        </div>
        <SectionTitle
          action={
            <span className="text-sm font-bold text-muted-foreground">
              {ready}/{connected.length} prontos
            </span>
          }
        >
          Jogadores
        </SectionTitle>
        {teams ? (
          <div className="grid grid-cols-2 gap-3">
            {(["A", "B"] as const).map((t) => (
              <div
                key={t}
                className={cn(
                  "rounded-2xl p-3",
                  t === "A"
                    ? "bg-forest/10 ring-1 ring-forest/30"
                    : "bg-coral/10 ring-1 ring-coral/30",
                )}
              >
                <p className="mb-2 text-center font-display font-bold">Equipa {t}</p>
                <div className="space-y-2">
                  {members
                    .filter((m) => room.members.find((x) => x.userId === m.id)?.team === t)
                    .map((m) => (
                      <div key={m.id} className="flex items-center gap-2 rounded-xl bg-surface p-2">
                        <Avatar name={m.name} color={m.color} size={32} />
                        <span className="min-w-0 flex-1 truncate text-sm font-bold">
                          {m.name}
                          {m.isMe && " (tu)"}
                        </span>
                        {m.ready && <span className="text-xs font-bold text-success">✓</span>}
                      </div>
                    ))}
                  {inTeam(t).length < 2 && (
                    <p className="rounded-xl border border-dashed p-2 text-center text-xs font-semibold text-muted-foreground">
                      Lugar livre
                    </p>
                  )}
                </div>
                {myTeam && myTeam !== t && inTeam(t).length < 2 && (
                  <AppButton
                    size="sm"
                    variant="secondary"
                    className="mt-2 w-full"
                    disabled={busy}
                    onClick={() => run(() => arena.setTeam(t))}
                  >
                    Mudar para a {t}
                  </AppButton>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <LobbyPlayer key={m.id} m={m} />
            ))}
          </div>
        )}
        {room.members.length < room.config.players && (
          <AppButton
            variant="secondary"
            size="md"
            className="mt-3 w-full"
            onClick={() => setInviteOpen(true)}
          >
            <UserPlus className="size-4" />
            Convidar amigos
          </AppButton>
        )}
        <p className="mt-4 text-center text-xs font-semibold text-muted-foreground">
          {teams
            ? "Convida amigos ou partilha o código. São precisas 2 pessoas em cada equipa."
            : "Convida amigos ou partilha o código. As recompensas (XP e moedas) só contam em salas com 4 ou mais jogadores."}
        </p>
      </main>
      <InviteFriends
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        exclude={room.members.map((m) => m.userId)}
      />
      <div className="absolute inset-x-0 bottom-0 space-y-2 bg-background px-5 pt-3 pb-5 safe-bottom">
        {error && <p className="text-center text-sm font-bold text-destructive">{error}</p>}
        {isHost ? (
          <AppButton onClick={() => run(arena.start)} disabled={!canStart || busy}>
            {canStart
              ? "Começar partida"
              : connected.length < 2
                ? "À espera de jogadores…"
                : !teamsReady
                  ? "São precisas 2 pessoas em cada equipa"
                  : "À espera que todos fiquem prontos"}
          </AppButton>
        ) : (
          <AppButton
            variant={mine?.ready ? "secondary" : "primary"}
            disabled={busy}
            onClick={() => run(() => arena.ready(!mine?.ready))}
          >
            {mine?.ready ? "Não estou pronto" : "Estou pronto"}
          </AppButton>
        )}
        <AppButton variant="ghost" size="md" className="w-full" onClick={() => void arena.leave()}>
          <LogOut className="size-4" />
          Sair da sala
        </AppButton>
      </div>
    </>
  );
}

/** Lista de amigos para convidar (o servidor confirma que são mesmo amigos). */
function InviteFriends({
  open,
  onClose,
  exclude,
}: {
  open: boolean;
  onClose: () => void;
  exclude: string[];
}) {
  const friends = useQuery({
    queryKey: socialKeys.friends,
    queryFn: socialApi.friends,
    enabled: open,
  });
  const [sent, setSent] = useState<Record<string, "sent" | string>>({});
  const list = (friends.data?.friends ?? []).filter((f) => !exclude.includes(f.id));
  return (
    <Modal open={open} onClose={onClose}>
      <p className="mb-3 font-display text-xl font-bold">Convidar amigos</p>
      {friends.isPending ? (
        <LoadingState />
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ainda não tens amigos para convidar. Adiciona amigos no separador Amigos.
        </p>
      ) : (
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {list.map((f) => {
            const state = sent[f.id];
            return (
              <div key={f.id} className="flex items-center gap-3">
                <Avatar name={f.name} color={avatarColor(f.avatarColor)} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{f.name}</p>
                  {state && state !== "sent" && (
                    <p className="text-xs font-semibold text-destructive">{state}</p>
                  )}
                </div>
                <AppButton
                  size="sm"
                  variant={state === "sent" ? "secondary" : "primary"}
                  disabled={state === "sent"}
                  onClick={async () => {
                    const r = await arena.invite(f.id);
                    setSent((s) => ({ ...s, [f.id]: r.ok ? "sent" : errorText(r) }));
                  }}
                >
                  {state === "sent" ? "Convidado" : "Convidar"}
                </AppButton>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

function InviteBanner({
  name,
  duel,
  onJoin,
  onDismiss,
}: {
  name: string;
  duel: boolean;
  onJoin: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="animate-rise mx-4 mb-3 flex items-center gap-3 rounded-2xl bg-sun p-3 text-accent-foreground">
      <p className="flex-1 text-sm font-bold">
        {duel
          ? `${name} desafiou-te para um duelo!`
          : `${name} convidou-te para uma sala da Arena!`}
      </p>
      <AppButton size="sm" onClick={onJoin}>
        Entrar
      </AppButton>
      <button type="button" onClick={onDismiss} aria-label="Ignorar convite" className="px-1">
        <X className="size-4" />
      </button>
    </div>
  );
}

/* ------------------------- Procurar partida (desconhecidos) ------------------------- */

/**
 * Sobrevivência pública: o servidor junta-nos a uma sala de espera que começa sozinha
 * (ao encher, ou pouco depois de haver o mínimo de jogadores). Sem bots.
 */
export function ServerSearch() {
  const s = useArena(true);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const asked = useRef(false);
  const now = useNow();

  // Entra na fila uma vez; ao sair do ecrã sem a partida ter começado, sai da fila.
  useEffect(() => {
    if (s.status !== "ready" || asked.current) return;
    asked.current = true;
    void arena.findMatch("survival").then((r) => {
      if (r.ok) setQueued(true);
      else setError(errorText(r));
    });
  }, [s.status]);
  useEffect(
    () => () => {
      asked.current = false;
      if (!arena.getState().match) void arena.leave();
    },
    [],
  );

  const room = queued && s.room?.isPublic && s.room.mode === "survival" ? s.room : null;
  useEffect(() => {
    if (room && s.match && s.match.phase !== "finished") navigate({ to: "/play/survival" });
  }, [room, s.match, navigate]);

  const cancel = () => navigate({ to: "/challenges" });
  const players = (room?.members ?? []).map((m) => ({
    id: m.userId,
    name: m.name,
    color: avatarColor(m.avatarColor),
    isMe: m.userId === s.me,
  }));
  const min = MULTIPLAYER_CONFIG.matchmaking.minPlayers;
  const startsIn = room?.autoStartAt
    ? Math.max(0, Math.ceil((room.autoStartAt - now) / 1000))
    : null;
  const note = error
    ? error
    : !room
      ? s.status === "ready"
        ? "A procurar uma sala…"
        : "A ligar ao servidor da Arena…"
      : startsIn !== null
        ? `Começa em ${startsIn}s · entra mais gente até lá`
        : players.length < min
          ? `Começa quando houver ${min} jogadores (faltam ${min - players.length})`
          : "A começar…";

  return (
    <PhoneFrame>
      <MatchmakingScreen
        players={players}
        size={room?.config.players ?? MULTIPLAYER_CONFIG.publicSurvival.players}
        full={Boolean(room && players.length >= room.config.players)}
        note={note}
        onCancel={cancel}
      />
    </PhoneFrame>
  );
}

/* ------------------------------ Entrar com código ------------------------------ */

export function ServerJoin() {
  const s = useArena(true);
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setState("loading");
    setError(null);
    const r = await arena.join(code);
    if (r.ok) navigate({ to: "/play/private" });
    else setError(errorText(r));
    setState("idle");
  };
  return (
    <PhoneFrame>
      <AppHeader left={<BackButton />} title="Entrar com código" />
      <ConnectionNote s={s} />
      <main className="flex flex-1 flex-col gap-4 px-5 pb-6">
        <label htmlFor="room-code" className="mt-6 text-center font-display text-xl font-bold">
          Código da sala
        </label>
        <input
          id="room-code"
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={6}
          value={code}
          placeholder="______"
          onChange={(e) => {
            setCode(
              e.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, 6),
            );
            setError(null);
          }}
          className={cn(
            "mx-auto h-16 w-64 rounded-2xl border-[1.5px] bg-surface text-center font-display text-4xl font-bold tracking-[0.25em] outline-none placeholder:text-muted-foreground/40",
            error ? "border-destructive animate-shake" : "border-border",
          )}
        />
        <p
          role="status"
          className={cn(
            "min-h-6 text-center font-bold",
            error ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {state === "loading" ? "A entrar…" : (error ?? "Pede o código ao host da sala.")}
        </p>
        <div className="mt-auto">
          <AppButton
            onClick={submit}
            disabled={code.length !== 6 || state === "loading" || s.status !== "ready"}
          >
            {state === "loading" ? "A entrar…" : "Entrar"}
          </AppButton>
        </div>
      </main>
    </PhoneFrame>
  );
}

/* ---------------------------------- Partida ---------------------------------- */

export function ServerSurvival() {
  const s = useArena(true);
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());
  const [spectating, setSpectating] = useState(false);
  const m = s.match;
  const room = s.room;
  const me = s.me;

  // Relógio local só para mostrar a contagem até ao prazo oficial.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  // Sem partida (ou já mostrada): volta à sala.
  const done = Boolean(s.finished && s.finished.matchId === shownMatchId);
  useEffect(() => {
    if (s.status === "ready" && (!m || done)) navigate({ to: "/play/private" });
  }, [m, done, s.status, navigate]);

  // Fim: guarda o resultado para o ecrã de resultados.
  useEffect(() => {
    const f = s.finished;
    if (!f || !me || f.matchId === shownMatchId) return;
    const t = setTimeout(() => {
      const mine = f.standings.find((x) => x.userId === me);
      const answered = mine ? mine.correct + mine.wrong + mine.timeouts : 0;
      session.setResult({
        mode: "survival",
        myPlace: mine?.place ?? f.standings.length,
        reward: { xp: s.reward?.xp ?? 0, coins: s.reward?.coins ?? 0 },
        standings: f.standings.map((x) => ({
          id: x.userId,
          name: x.name,
          color: avatarColor(x.avatarColor),
          place: x.place,
          isMe: x.userId === me,
          detail: x.left ? "saiu" : `${x.correct} certas`,
        })),
        stats: {
          questions: answered,
          correct: mine?.correct ?? 0,
          wrong: mine?.wrong ?? 0,
          timeouts: mine?.timeouts ?? 0,
          accuracy: answered ? Math.round(((mine?.correct ?? 0) / answered) * 100) : 0,
        },
      });
      shownMatchId = f.matchId;
      navigate({ to: "/play/results" });
    }, 3200);
    return () => clearTimeout(t);
  }, [s.finished, s.reward, me, navigate]);

  // Sons por fase (só apresentação).
  const myOutcome = m?.reveal && me ? m.reveal.outcomes[me] : undefined;
  useEffect(() => {
    if (m?.phase === "reveal" && myOutcome)
      sound.play(myOutcome === "correct" ? "correct" : "lifeLost");
    else if (m?.phase === "final") sound.play("final");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m?.phase, m?.round]);
  useEffect(() => {
    if (!s.finished || !me || s.finished.matchId === shownMatchId) return;
    sound.play(s.finished.standings[0]?.userId === me ? "victory" : "defeat");
  }, [s.finished, me]);
  const secLeft = m?.deadlineAt ? Math.max(0, Math.ceil((m.deadlineAt - now) / 1000)) : 0;
  useEffect(() => {
    if (m?.phase === "question" && secLeft > 0 && secLeft <= 3) sound.play("urgent");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secLeft]);

  if (!m || !room) {
    return (
      <PhoneFrame>
        <ConnectionNote s={s} />
        <main className="px-4 pt-10">
          <LoadingState />
        </main>
      </PhoneFrame>
    );
  }

  const names = Object.fromEntries(room.members.map((x) => [x.userId, x.name]));
  const colors = Object.fromEntries(
    room.members.map((x) => [x.userId, avatarColor(x.avatarColor)]),
  );
  const players: SurvivalPlayer[] = m.players.map((p) => ({
    id: p.userId,
    name: names[p.userId] ?? "?",
    color: colors[p.userId] ?? "ocean",
    isMe: p.userId === me,
    lives: p.lives,
    correct: p.correct,
    wrong: p.wrong,
    timeouts: p.timeouts,
    eliminatedRound: null,
    placement: p.placement,
  }));
  const mePlayer = players.find((p) => p.isMe);
  const alive = players.filter((p) => p.lives > 0);
  const lives = room.config.lives;
  const amAlive = (mePlayer?.lives ?? (m.round === 0 ? lives : 0)) > 0;
  const q = m.question;
  const quiz: QuizQuestion | null = q
    ? {
        id: q.questionId,
        type: "MULTIPLE_CHOICE",
        prompt: q.prompt,
        options: q.options.map((o) => o.label),
        correctIndex: -1,
      }
    : null;
  const correctId = m.reveal?.correctOptionId;
  const optState = (id: string): OptionState => {
    if (m.phase === "question") return m.selected === id ? "selected" : "idle";
    if (id === correctId) return "correct";
    if (id === m.selected) return "wrong";
    return "dim";
  };
  const showFeedback = m.phase === "reveal" && myOutcome && now - (m.revealedAt ?? 0) < 1700;
  const showSummary = m.phase === "reveal" && m.reveal && !showFeedback;
  const eliminatedNow = !amAlive && m.round > 0 && !spectating && !s.finished;
  const countdown =
    m.phase === "countdown" && m.countdownAt
      ? m.countdownAt - now > 0
        ? Math.min(3, Math.ceil((m.countdownAt - now) / 1000))
        : ("go" as const)
      : null;
  const winner = done ? undefined : s.finished?.standings[0];
  const finalPair =
    m.phase === "final" && m.finalIds ? players.filter((p) => m.finalIds!.includes(p.id)) : [];

  return (
    <PhoneFrame className="bg-muted">
      <ConnectionNote s={s} />
      {m.round > 0 && quiz && (
        <>
          <MatchTopBar
            round={m.round}
            alive={alive.length}
            left={
              m.phase === "question" && m.deadlineAt ? Math.max(0, (m.deadlineAt - now) / 1000) : 0
            }
            total={room.config.seconds}
            spectator={!amAlive}
          />
          <main className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-28">
            {amAlive && (
              <div className="flex justify-center">
                <LivesIndicator lives={mePlayer?.lives ?? lives} max={lives} size={28} />
              </div>
            )}
            <p className="text-center text-sm font-bold text-muted-foreground">
              {q?.mode === "meaning" ? "O que significa?" : "Como se diz?"}
              {room.languageId === KRIOLU_LANGUAGE_ID && " · Kriolu (Beta)"}
              {q && <QuestionSpeakButton q={q} />}
            </p>
            <QuestionCard q={quiz} />
            <div className="space-y-3">
              {q!.options.map((o, i) => (
                <QuizOption
                  key={o.id}
                  index={i}
                  label={o.label}
                  state={optState(o.id)}
                  disabled={m.phase !== "question" || !amAlive || m.selected !== null}
                  onClick={() => {
                    if (m.phase === "question" && amAlive && !m.selected) void arena.answer(o.id);
                  }}
                />
              ))}
            </div>
            {m.phase === "reveal" && <RevealPronunciation reveal={m.reveal} />}
            {m.phase === "question" && m.selected && (
              <p className="text-center text-sm font-semibold text-muted-foreground">
                Resposta enviada · {m.answeredCount}/{alive.length} já responderam
              </p>
            )}
            {!amAlive && (
              <button
                type="button"
                onClick={() => {
                  void arena.leave();
                  navigate({ to: "/challenges" });
                }}
                className="mx-auto text-sm font-bold text-muted-foreground underline"
              >
                Sair da partida
              </button>
            )}
          </main>
          <PlayersPanel players={players} maxLives={lives} />
        </>
      )}

      {countdown !== null && <CountdownOverlay value={countdown} title="A partida vai começar!" />}
      {showFeedback && myOutcome && (
        <AnswerFeedback kind={myOutcome} lives={mePlayer?.lives ?? 0} maxLives={lives} />
      )}
      {showSummary && !eliminatedNow && (
        <RoundResult summary={m.reveal!.summary} survivors={alive} names={names} />
      )}
      {eliminatedNow && !showFeedback && (
        <PlayerEliminatedOverlay
          place={mePlayer?.placement ?? players.length}
          correct={mePlayer?.correct ?? 0}
          wrong={(mePlayer?.wrong ?? 0) + (mePlayer?.timeouts ?? 0)}
          onWatch={() => setSpectating(true)}
          onLeave={() => {
            void arena.leave();
            navigate({ to: "/challenges" });
          }}
        />
      )}
      {finalPair.length === 2 && (
        <FinalBattle
          a={finalPair.find((p) => p.isMe) ?? finalPair[0]!}
          b={
            finalPair.find((p) => p !== (finalPair.find((x) => x.isMe) ?? finalPair[0])) ??
            finalPair[1]!
          }
          maxLives={lives}
        />
      )}
      {winner && (
        <WinnerOverlay
          name={winner.name}
          color={avatarColor(winner.avatarColor)}
          isMe={winner.userId === me}
        />
      )}
    </PhoneFrame>
  );
}
