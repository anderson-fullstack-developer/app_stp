/**
 * 2 contra 2 com o servidor em tempo real: partida com placar por equipa e resultado.
 * A sala (criar, equipas, pronto, começar) é a sala privada em /play/private.
 */
import { Link, useNavigate } from "@tanstack/react-router";
import { MULTIPLAYER_CONFIG } from "@stp/config";
import type { QuizQuestion } from "@stp/types/multiplayer";
import { useEffect } from "react";
import { Avatar } from "@/components/app/Badges";
import { AppButton } from "@/components/app/Buttons";
import { LoadingState } from "@/components/app/Primitives";
import {
  countdownValue,
  secondsLeft,
  useNow,
  useRoundGains,
  useUrgencySound,
} from "@/components/play/arena-hooks";
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
import { PhoneFrame } from "@/layouts/AppShell";
import { QuestionSpeakButton } from "@/components/app/SpeakButton";
import { RevealPronunciation } from "@/components/play/RevealPronunciation";
import { avatarColor } from "@/lib/avatar";
import { KRIOLU_LANGUAGE_ID } from "@/lib/kriolu-course";
import { arena, type ArenaState, useArena } from "@/lib/multiplayer/arena-client";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

type Team = "A" | "B";
const other = (t: Team): Team => (t === "A" ? "B" : "A");

const REWARD_NOTE: Record<string, string> = {
  daily_limit: "Já chegaste às 10 partidas premiadas de hoje.",
  left: "Saíste a meio: sem recompensa.",
  error: "Não foi possível registar a recompensa. Tenta outra vez mais tarde.",
};

export function ServerTeams() {
  const s = useArena(true);
  const navigate = useNavigate();
  const teamsRoom = s.room?.mode === "teams";
  const done = teamsRoom && s.finished && (!s.match || s.match.phase === "finished");

  // Sem partida de equipas a decorrer: volta à sala.
  useEffect(() => {
    if (s.status === "ready" && !done && (!teamsRoom || !s.match)) {
      navigate({ to: "/play/private", search: { mode: "teams" } });
    }
  }, [s.status, done, teamsRoom, s.match, navigate]);

  if (done) return <TeamsResult s={s} />;
  if (teamsRoom && s.match) return <TeamsMatch s={s} />;
  return (
    <PhoneFrame>
      <main className="px-4 pt-10">
        <LoadingState />
      </main>
    </PhoneFrame>
  );
}

function TeamsMatch({ s }: { s: ArenaState }) {
  const m = s.match!;
  const room = s.room!;
  const now = useNow();
  const gained = useRoundGains(m, s.me);
  useUrgencySound(m, now);
  const secLeft = secondsLeft(m, now);
  const countdown = countdownValue(m, now);

  const myTeam: Team = room.members.find((x) => x.userId === s.me)?.team ?? "A";
  const name = (id: string) => room.members.find((x) => x.userId === id)?.name ?? "?";
  const color = (id: string) =>
    avatarColor(room.members.find((x) => x.userId === id)?.avatarColor ?? null);
  const playersOf = (t: Team) => m.players.filter((p) => p.team === t);
  const total = (t: Team) => playersOf(t).reduce((n, p) => n + p.score, 0);
  const q = m.question;

  if (!q) {
    // Antes da 1.ª pergunta: equipas frente a frente + contagem.
    return (
      <PhoneFrame>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-forest px-6 text-primary-foreground">
          <p className="font-display text-sm font-bold">
            2 contra 2 · {MULTIPLAYER_CONFIG.teams.questions} perguntas
          </p>
          <div className="flex w-full items-center justify-around">
            {([myTeam, other(myTeam)] as const).map((t, i) => (
              <div key={t} className="flex flex-col items-center gap-2">
                <div className="flex -space-x-4">
                  {room.members
                    .filter((x) => x.team === t)
                    .map((x) => (
                      <Avatar
                        key={x.userId}
                        name={x.name}
                        color={avatarColor(x.avatarColor)}
                        size={64}
                        className="animate-pop ring-4 ring-primary-foreground/40"
                      />
                    ))}
                </div>
                <p className="font-display text-lg font-bold">
                  {i === 0 ? "A tua equipa" : `Equipa ${t}`}
                </p>
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
            {m.round}/{MULTIPLAYER_CONFIG.teams.questions}
          </span>
          <TimerCount left={secLeft} />
        </div>
        <GameTimer left={secLeft} total={room.config.seconds} />
        <TeamScore
          a={total(myTeam)}
          b={total(other(myTeam))}
          labelA="A tua equipa"
          labelB={`Equipa ${other(myTeam)}`}
        />
      </div>
      <main className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-8">
        <p className="text-center text-sm font-bold text-muted-foreground">
          {q.mode === "meaning" ? "O que significa?" : "Como se diz?"}
          {room.languageId === KRIOLU_LANGUAGE_ID && " · Kriolu (Beta)"}
          <QuestionSpeakButton q={q} />
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
        {m.phase === "reveal" && <RevealPronunciation reveal={m.reveal} />}
        {m.phase === "question" && m.selected && (
          <p className="text-center text-sm font-semibold text-muted-foreground">
            Resposta enviada · {m.answeredCount}/{m.players.length} já responderam
          </p>
        )}
        {m.phase === "reveal" && (
          <div className="animate-rise grid grid-cols-2 gap-2">
            {([myTeam, other(myTeam)] as const).map((t) => (
              <div
                key={t}
                className={cn(
                  "rounded-2xl p-3 text-primary-foreground",
                  t === myTeam ? "bg-forest" : "bg-coral",
                )}
              >
                {playersOf(t).map((p) => (
                  <p key={p.userId} className="flex justify-between text-sm font-bold">
                    <span className="truncate">{p.userId === s.me ? "Tu" : name(p.userId)}</span>
                    <span>+{gained[p.userId] ?? 0}</span>
                  </p>
                ))}
                <p className="mt-1 flex justify-between border-t border-primary-foreground/30 pt-1 font-display font-bold">
                  <span>Total</span>
                  <span>{total(t)}</span>
                </p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-auto flex justify-center gap-2">
          {m.players.map((p) => (
            <Avatar
              key={p.userId}
              name={name(p.userId)}
              color={color(p.userId)}
              size={28}
              dim={p.left}
              className={cn(p.team === myTeam ? "ring-forest" : "ring-coral")}
            />
          ))}
        </div>
      </main>
    </PhoneFrame>
  );
}

function TeamsResult({ s }: { s: ArenaState }) {
  const navigate = useNavigate();
  const f = s.finished!;
  const myTeam: Team =
    f.standings.find((x) => x.userId === s.me)?.team ??
    s.room?.members.find((x) => x.userId === s.me)?.team ??
    "A";
  const winner = f.winnerTeam ?? null;
  const won = winner === myTeam;
  const reward = { xp: s.reward?.xp ?? 0, coins: s.reward?.coins ?? 0 };
  const note = s.reward ? REWARD_NOTE[s.reward.reason] : undefined;

  useEffect(() => {
    sound.play(won ? "victory" : "defeat");
  }, [won]);

  const leave = async () => {
    await arena.leave();
    navigate({ to: "/challenges" });
  };

  return (
    <PhoneFrame>
      <div className="relative flex flex-1 flex-col gap-4 overflow-hidden px-5 pt-8 pb-8 safe-top">
        {won && <Confetti />}
        <div className="text-center">
          <p className="text-5xl">{winner === null ? "🤝" : won ? "🏆" : "💪"}</p>
          <h1 className="mt-2 font-display text-3xl font-bold">
            {winner === null
              ? "Empate!"
              : won
                ? "A tua equipa ganhou!"
                : `A equipa ${winner} ganhou`}
          </h1>
          <p className="font-semibold text-muted-foreground">
            {won ? "Excelente trabalho de equipa!" : "Para a próxima!"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {([myTeam, other(myTeam)] as const).map((t) => (
            <div
              key={t}
              className={cn("card rounded-2xl p-3", winner === t && "ring-2 ring-accent")}
            >
              <p className="text-center text-sm font-bold text-muted-foreground">
                {t === myTeam ? "A tua equipa" : `Equipa ${t}`}
              </p>
              <p className="text-center font-display text-3xl font-bold tabular-nums">
                {f.teams?.[t] ?? 0}
              </p>
              <div className="mt-2 space-y-1">
                {f.standings
                  .filter((x) => x.team === t)
                  .map((x) => (
                    <div key={x.userId} className="flex items-center gap-1.5 text-sm">
                      <Avatar name={x.name} color={avatarColor(x.avatarColor)} size={22} />
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        {x.userId === s.me ? "Tu" : x.name}
                        {x.left && " (saiu)"}
                      </span>
                      <span className="font-bold tabular-nums">{x.score}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
        <div className="text-center">
          <p className="mb-2 font-bold">A tua recompensa</p>
          <RewardRow reward={reward} />
          {note && <p className="mt-2 text-sm text-muted-foreground">{note}</p>}
        </div>
        <div className="mt-auto space-y-3">
          <Link to="/play/private" className="block">
            <AppButton>Jogar outra vez (mesma sala)</AppButton>
          </Link>
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
