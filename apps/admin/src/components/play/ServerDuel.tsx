/**
 * Duelo 1 contra 1 com o servidor em tempo real: escolher um amigo, esperar que entre,
 * 10 perguntas com placar (pontos = certa + rapidez, calculados no servidor) e resultado.
 */
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { MULTIPLAYER_CONFIG } from "@stp/config";
import type { QuizQuestion } from "@stp/types/multiplayer";
import { Swords } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/app/Badges";
import { BackButton } from "@/components/app/BackButton";
import { AppButton } from "@/components/app/Buttons";
import { EmptyState, LoadingState } from "@/components/app/Primitives";
import {
  Confetti,
  CountdownOverlay,
  GameTimer,
  QuestionCard,
  QuizOption,
  TimerCount,
  type OptionState,
} from "@/components/play/MatchUI";
import { RewardRow, TeamScore } from "@/components/play/ResultUI";
import {
  countdownValue,
  secondsLeft,
  useNow,
  useRoundGains,
  useUrgencySound,
} from "@/components/play/arena-hooks";
import { AppHeader, PhoneFrame } from "@/layouts/AppShell";
import { avatarColor } from "@/lib/avatar";
import { KRIOLU_LANGUAGE_ID } from "@/lib/kriolu-course";
import { arena, type ArenaState, useArena } from "@/lib/multiplayer/arena-client";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { socialApi, socialKeys } from "@/services/social-api.service";

const ERROR_TEXT: Record<string, string> = {
  NOT_FRIENDS: "Só podes desafiar amigos.",
  IN_MATCH: "Estás a meio de uma partida.",
  NO_QUESTIONS: "Ainda não há perguntas suficientes nesta língua.",
  LANGUAGE_NOT_AVAILABLE: "Esta língua ainda não está disponível.",
  OFFLINE: "Sem ligação ao servidor da Arena.",
};

const REWARD_NOTE: Record<string, string> = {
  duel_limit: "Já fizeste os 3 duelos premiados de hoje — este foi só pela glória.",
  daily_limit: "Já chegaste às 10 partidas premiadas de hoje.",
  left: "Saíste a meio: sem recompensa.",
  error: "Não foi possível registar a recompensa. Tenta outra vez mais tarde.",
};

export function ServerDuel({ friend }: { friend?: string | undefined }) {
  const s = useArena(true);
  const inDuel = s.room?.mode === "duel";
  const match = inDuel ? s.match : null;
  const done = inDuel && s.finished && (!s.match || s.match.phase === "finished");

  if (done) return <DuelResult s={s} />;
  if (match && match.phase !== "finished") return <DuelMatch s={s} />;
  if (inDuel && s.room) return <DuelWaiting s={s} />;
  return <PickFriend s={s} friend={friend} />;
}

/* ------------------------------ escolher amigo ------------------------------ */

function PickFriend({ s, friend }: { s: ArenaState; friend?: string | undefined }) {
  const friends = useQuery({ queryKey: socialKeys.friends, queryFn: socialApi.friends });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const auto = useRef<string | null>(null);

  const challenge = async (userId: string) => {
    setBusy(userId);
    setError(null);
    const r = await arena.challenge(userId);
    if (!r.ok) setError(ERROR_TEXT[r.code] ?? r.message);
    setBusy(null);
  };

  // Veio do botão "Desafiar" de um amigo: desafia logo (uma vez).
  useEffect(() => {
    if (!friend || s.status !== "ready" || auto.current === friend) return;
    auto.current = friend;
    void challenge(friend);
  }, [friend, s.status]);

  const list = friends.data?.friends ?? [];
  return (
    <PhoneFrame>
      <AppHeader left={<BackButton />} title="Duelo 1 contra 1" />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-8">
        <div className="rounded-[1.75rem] bg-forest p-5 text-primary-foreground pattern-leaf">
          <Swords className="size-8" />
          <p className="mt-2 font-display text-2xl font-bold">Desafia um amigo</p>
          <p className="text-sm opacity-85">
            {MULTIPLAYER_CONFIG.duel.questions} perguntas iguais para os dois. Cada certa vale 100
            pontos, mais um bónus por responderes depressa.
          </p>
        </div>
        {s.status !== "ready" && (
          <p className="text-center text-sm font-semibold text-muted-foreground">
            A ligar ao servidor da Arena…
          </p>
        )}
        {error && <p className="text-center font-bold text-destructive">{error}</p>}
        {friends.isPending ? (
          <LoadingState />
        ) : list.length === 0 ? (
          <>
            <EmptyState
              title="Ainda não tens amigos"
              text="Adiciona amigos para os desafiar para um duelo."
            />
            <Link to="/friends" className="block">
              <AppButton variant="secondary">Encontrar amigos</AppButton>
            </Link>
          </>
        ) : (
          list.map((f) => (
            <div key={f.id} className="card animate-rise flex items-center gap-3 rounded-2xl p-3">
              <Avatar name={f.name} color={avatarColor(f.avatarColor)} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{f.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  @{f.username} · Nível {f.level}
                </p>
              </div>
              <AppButton
                size="sm"
                disabled={s.status !== "ready" || busy !== null}
                onClick={() => void challenge(f.id)}
              >
                <Swords className="size-4" />
                {busy === f.id ? "A desafiar…" : "Desafiar"}
              </AppButton>
            </div>
          ))
        )}
      </main>
    </PhoneFrame>
  );
}

/* ---------------------------------- à espera ---------------------------------- */

function DuelWaiting({ s }: { s: ArenaState }) {
  const room = s.room!;
  const me = room.members.find((m) => m.userId === s.me);
  const other = room.members.find((m) => m.userId !== s.me);
  return (
    <PhoneFrame>
      <AppHeader left={<BackButton />} title="Duelo 1 contra 1" />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <Avatar
              name={me?.name ?? "Tu"}
              color={avatarColor(me?.avatarColor ?? null)}
              size={80}
            />
            <p className="font-bold">Tu</p>
          </div>
          <p className="font-display text-4xl font-bold text-muted-foreground">VS</p>
          <div className="flex flex-col items-center gap-2">
            {other ? (
              <Avatar name={other.name} color={avatarColor(other.avatarColor)} size={80} />
            ) : (
              <div className="grid size-20 animate-pulse place-items-center rounded-full bg-muted text-3xl">
                ?
              </div>
            )}
            <p className="font-bold">{other?.name ?? "…"}</p>
          </div>
        </div>
        <p className="font-semibold text-muted-foreground">
          {other
            ? "A preparar o duelo…"
            : "Convite enviado! O duelo começa assim que o teu amigo entrar (o convite dura 10 minutos)."}
        </p>
        <AppButton variant="secondary" onClick={() => void arena.leave()}>
          Cancelar duelo
        </AppButton>
      </main>
    </PhoneFrame>
  );
}

/* ---------------------------------- partida ---------------------------------- */

function DuelMatch({ s }: { s: ArenaState }) {
  const m = s.match!;
  const room = s.room!;
  const now = useNow();
  const gained = useRoundGains(m, s.me);
  useUrgencySound(m, now);
  const secLeft = secondsLeft(m, now);

  const me = room.members.find((x) => x.userId === s.me);
  const other = room.members.find((x) => x.userId !== s.me);
  const score = (id?: string) => m.players.find((p) => p.userId === id)?.score ?? 0;
  const q = m.question;
  const countdown = countdownValue(m, now);

  if (!q) {
    // Antes da 1.ª pergunta: VS + contagem.
    return (
      <PhoneFrame>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-forest px-6 text-primary-foreground">
          <p className="font-display text-sm font-bold">
            {MULTIPLAYER_CONFIG.duel.questions} perguntas · acerto + velocidade
          </p>
          <div className="flex w-full items-center justify-around">
            {[me, other].map((p, i) => (
              <div key={p?.userId ?? i} className="flex flex-col items-center gap-2">
                <Avatar
                  name={p?.name ?? "?"}
                  color={avatarColor(p?.avatarColor ?? null)}
                  size={88}
                  className="animate-pop ring-4 ring-primary-foreground/40"
                />
                <p className="font-display text-lg font-bold">{i === 0 ? "Tu" : p?.name}</p>
              </div>
            ))}
          </div>
          <p className="animate-pop font-display text-5xl font-bold">VS</p>
        </div>
        {countdown !== null && <CountdownOverlay value={countdown} />}
      </PhoneFrame>
    );
  }

  const quiz: QuizQuestion = {
    id: q.questionId,
    type: "MULTIPLE_CHOICE",
    prompt: q.prompt,
    options: q.options.map((o) => o.label),
    correctIndex: -1,
  };
  const correctId = m.reveal?.correctOptionId;
  const optState = (id: string): OptionState => {
    if (m.phase === "question") return m.selected === id ? "selected" : "idle";
    if (id === correctId) return "correct";
    if (id === m.selected) return "wrong";
    return "dim";
  };

  return (
    <PhoneFrame className="bg-muted">
      <div className="space-y-2.5 px-4 pt-3 safe-top">
        <div className="flex items-center justify-between">
          <span className="rounded-xl bg-cocoa px-3 py-1 font-display text-sm font-bold text-secondary-foreground">
            {m.round}/{MULTIPLAYER_CONFIG.duel.questions}
          </span>
          <TimerCount left={m.phase === "question" ? secLeft : 0} />
        </div>
        <GameTimer left={m.phase === "question" ? secLeft : 0} total={room.config.seconds} />
        <TeamScore
          a={score(s.me ?? undefined)}
          b={score(other?.userId)}
          labelA="Tu"
          labelB={other?.name ?? "Adversário"}
        />
      </div>
      <main className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-8">
        <p className="text-center text-sm font-bold text-muted-foreground">
          {q.mode === "meaning" ? "O que significa?" : "Como se diz?"}
          {room.languageId === KRIOLU_LANGUAGE_ID && " · Kriolu (Beta)"}
        </p>
        <QuestionCard q={quiz} />
        <div className="space-y-3">
          {q.options.map((o, i) => (
            <QuizOption
              key={o.id}
              index={i}
              label={o.label}
              state={optState(o.id)}
              disabled={m.phase !== "question" || m.selected !== null}
              onClick={() => {
                if (m.phase === "question" && !m.selected) void arena.answer(o.id);
              }}
            />
          ))}
        </div>
        {m.phase === "question" && m.selected && (
          <p className="text-center text-sm font-semibold text-muted-foreground">
            Resposta enviada · à espera de {other?.name ?? "o adversário"}…
          </p>
        )}
        {m.phase === "reveal" && (
          <div className="animate-rise grid grid-cols-2 gap-2">
            {[me, other].map((p, i) => (
              <div
                key={p?.userId ?? i}
                className={cn(
                  "rounded-2xl p-3 text-primary-foreground",
                  i === 0 ? "bg-forest" : "bg-coral",
                )}
              >
                <p className="flex justify-between text-sm font-bold">
                  <span>{i === 0 ? "Tu" : p?.name}</span>
                  <span>+{gained[p?.userId ?? ""] ?? 0}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </PhoneFrame>
  );
}

/* --------------------------------- resultado --------------------------------- */

function DuelResult({ s }: { s: ArenaState }) {
  const navigate = useNavigate();
  const f = s.finished!;
  const mine = f.standings.find((x) => x.userId === s.me);
  const theirs = f.standings.find((x) => x.userId !== s.me);
  const draw = mine?.place === 1 && theirs?.place === 1;
  const won = mine?.place === 1 && !draw;
  const reward = { xp: s.reward?.xp ?? 0, coins: s.reward?.coins ?? 0 };
  const note = s.reward ? REWARD_NOTE[s.reward.reason] : undefined;

  useEffect(() => {
    sound.play(won ? "victory" : "defeat");
  }, [won]);

  const again = async () => {
    const opponent = theirs?.userId;
    await arena.leave();
    if (opponent) await arena.challenge(opponent);
  };
  const leave = async () => {
    await arena.leave();
    navigate({ to: "/challenges" });
  };

  return (
    <PhoneFrame>
      <div className="relative flex flex-1 flex-col gap-4 overflow-hidden px-5 pt-8 pb-8 safe-top">
        {won && <Confetti />}
        <div className="text-center">
          <p className="text-5xl">{won ? "🏆" : draw ? "🤝" : "💪"}</p>
          <h1 className="mt-2 font-display text-3xl font-bold">
            {draw ? "Empate!" : won ? "Ganhaste!" : `${theirs?.name ?? "O adversário"} ganhou`}
          </h1>
          <p className="font-semibold text-muted-foreground">
            {theirs?.left
              ? `${theirs.name} saiu do duelo.`
              : won
                ? "Excelente jogo!"
                : "Para a próxima!"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[mine, theirs].map((p, i) =>
            p ? (
              <div
                key={p.userId}
                className={cn(
                  "card flex flex-col items-center gap-1 rounded-2xl p-4",
                  p.place === 1 && "ring-2 ring-accent",
                )}
              >
                <Avatar name={p.name} color={avatarColor(p.avatarColor)} size={52} />
                <p className="font-bold">{i === 0 ? "Tu" : p.name}</p>
                <p className="font-display text-3xl font-bold tabular-nums">{p.score}</p>
                <p className="text-xs font-semibold text-muted-foreground">
                  {p.correct}/{f.rounds} certas
                </p>
              </div>
            ) : null,
          )}
        </div>
        <div className="text-center">
          <p className="mb-2 font-bold">A tua recompensa</p>
          <RewardRow reward={reward} />
          {note && <p className="mt-2 text-sm text-muted-foreground">{note}</p>}
        </div>
        <div className="mt-auto space-y-3">
          {theirs && !theirs.left && (
            <AppButton onClick={() => void again()}>
              <Swords className="size-5" />
              Desafiar outra vez
            </AppButton>
          )}
          <Link to="/play/history" className="block">
            <AppButton variant="secondary">Histórico de partidas</AppButton>
          </Link>
          <AppButton variant="ghost" onClick={() => void leave()}>
            Voltar aos desafios
          </AppButton>
        </div>
      </div>
    </PhoneFrame>
  );
}
