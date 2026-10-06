import { useBlockAds } from "@/config/ads";
/** Points-based match used by 1v1 and 2v2 (accuracy + speed). Mock-simulated opponents. */
import { Link } from "@tanstack/react-router";
import { useEffect, useReducer, useRef } from "react";
import { AdSlot } from "@/components/app/Ads";
import { Avatar } from "@/components/app/Badges";
import { AppButton } from "@/components/app/Buttons";
import { MULTIPLAYER_CONFIG } from "@stp/config";
import { listOpponents, opponentSkill } from "@/services/game.service";
import { game } from "@/hooks/use-game";
import { createRng, scoreAnswer } from "@stp/game-engine";
import { session } from "@/lib/multiplayer/session-store";
import { cn } from "@/lib/utils";
import { multiplayerService } from "@/services/game.service";
import type { MatchPlayerSeed } from "@stp/types/multiplayer";
import { Confetti, CountdownOverlay, GameTimer, QuestionCard, QuizOption, TimerCount, type OptionState } from "./MatchUI";
import { RewardRow, TeamScore } from "./ResultUI";
import { TeamCard } from "./LobbyUI";

export interface ScoreTeam { name: string; tone: "forest" | "coral"; players: MatchPlayerSeed[] }
type Phase = "intro" | "countdown" | "question" | "reveal" | "result";

export function ScoreMatch({ teams, questions: total, seconds, replayTo }: { teams: [ScoreTeam, ScoreTeam]; questions: number; seconds: number; replayTo: "/play/duel" | "/play/teams" }) {
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const rng = useRef(createRng());
  const qs = useRef(multiplayerService.getQuestions(total));
  const all = teams.flatMap((t) => t.players);
  const m = useRef({ phase: "intro" as Phase, count: 3 as number | "go", round: 0, left: seconds, deadline: 0, selected: null as number | null,
    points: Object.fromEntries(all.map((p) => [p.id, 0])) as Record<string, number>, last: {} as Record<string, number>, correct: 0, rewarded: false });
  const s = m.current;
  const go = (patch: Partial<typeof s>) => { Object.assign(m.current, patch); bump(); };
  const team = (i: 0 | 1) => teams[i].players.reduce((a, p) => a + (s.points[p.id] ?? 0), 0);
  const isDuel = teams[0].players.length === 1;

  const startQ = () => go({ phase: "question", round: m.current.round + 1, selected: null, left: seconds, deadline: Date.now() + seconds * 1000 });
  const resolve = (choice: number | null) => {
    const cur = m.current;
    if (cur.phase !== "question") return;
    const q = qs.current[cur.round - 1]!;
    const ratio = cur.left / seconds;
    const last: Record<string, number> = {};
    all.forEach((p) => {
      if (p.isMe) last[p.id] = scoreAnswer(choice === q.correctIndex, ratio);
      else {
        const skill = opponentSkill(p.id);
        last[p.id] = scoreAnswer(rng.current() < skill, 0.15 + rng.current() * 0.75);
      }
    });
    const points = { ...cur.points };
    Object.entries(last).forEach(([id, v]) => { points[id] = (points[id] ?? 0) + v; });
    go({ phase: "reveal", selected: choice, last, points, correct: cur.correct + (choice === q.correctIndex ? 1 : 0) });
  };

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (s.phase === "intro") t = setTimeout(() => go({ phase: "countdown", count: 3 }), 2200);
    if (s.phase === "countdown") t = setTimeout(() => (s.count === "go" ? startQ() : go({ count: (s.count as number) > 1 ? (s.count as number) - 1 : "go" })), 850);
    if (s.phase === "reveal") t = setTimeout(() => (m.current.round >= total ? go({ phase: "result" }) : startQ()), 2300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase, s.count, s.round]);

  useEffect(() => {
    if (s.phase !== "question") return;
    const id = setInterval(() => {
      const left = Math.max(0, (m.current.deadline - Date.now()) / 1000);
      go({ left });
      if (left <= 0) { clearInterval(id); resolve(null); }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase, s.round]);

  const myTeam = teams[0].players.some((p) => p.isMe) ? 0 : 1;
  const a = team(0), b = team(1);
  const winner: 0 | 1 = a >= b ? 0 : 1;
  const won = winner === myTeam;
  const reward = won ? MULTIPLAYER_CONFIG.matchRewards.win : MULTIPLAYER_CONFIG.matchRewards.lose;

  useEffect(() => {
    if (s.phase === "result" && !m.current.rewarded) { m.current.rewarded = true; game.addXp(reward.xp); game.addCoins(reward.coins); session.setPending(null); }
  }, [s.phase, reward.xp, reward.coins]);

  useBlockAds("multiplayer", s.phase !== "result");
  useBlockAds("countdown", s.phase === "countdown");
  useBlockAds("question", s.phase === "question" || s.phase === "reveal");
  if (s.phase === "intro") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-forest px-6 text-primary-foreground">
        <p className="font-display text-sm font-extrabold uppercase tracking-widest">{isDuel ? `${total} perguntas · acerto + velocidade` : "2 vs 2"}</p>
        <div className="flex w-full items-center justify-around">
          {teams.map((t, i) => (
            <div key={t.name} className="flex flex-col items-center gap-2">
              <div className="flex -space-x-4">{t.players.map((p) => <Avatar key={p.id} name={p.name} color={p.color} size={isDuel ? 88 : 64} className="animate-pop ring-4 ring-primary-foreground/40" />)}</div>
              <p className="font-display text-lg font-extrabold">{isDuel ? t.players[0]!.name : t.name}</p>
              {i === 0 && null}
            </div>
          ))}
        </div>
        <p className="animate-pop font-display text-5xl font-extrabold">VS</p>
      </div>
    );
  }

  if (s.phase === "result") {
    const winTeam = teams[winner];
    return (
      <div className="relative flex flex-1 flex-col gap-4 overflow-hidden px-5 pt-8 pb-8 safe-top">
        {won && <Confetti />}
        <div className="text-center">
          <p className="text-5xl">{won ? "🏆" : "💪"}</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold uppercase">{isDuel ? `${winTeam.players[0]!.name} venceu!` : `${winTeam.name} venceu`}</h1>
          <p className="font-semibold text-muted-foreground">{won ? "Excelente jogo!" : "Para a próxima!"}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {teams.map((t, i) => <TeamCard key={t.name} name={isDuel ? t.players[0]!.name : t.name} tone={t.tone} players={t.players} score={i === 0 ? a : b} highlight={i === winner} />)}
        </div>
        <div className="rounded-2xl border-2 border-border bg-surface p-4">
          <p className="mb-2 text-sm font-extrabold uppercase tracking-wide text-muted-foreground">Pontos individuais</p>
          {all.map((p) => (
            <div key={p.id} className="flex items-center gap-2 py-1"><Avatar name={p.name} color={p.color} size={28} /><span className="flex-1 font-bold">{p.name}{p.isMe && " (tu)"}</span><span className="font-display font-extrabold tabular-nums">{(s.points[p.id] ?? 0)}</span></div>
          ))}
        </div>
        <div className="text-center"><p className="mb-2 font-bold">A tua recompensa · {s.correct}/{total} certas</p><RewardRow reward={reward} /></div>
        <div className="mt-auto space-y-3">
          <Link to={replayTo}><AppButton>Jogar novamente</AppButton></Link>
          <Link to="/challenges"><AppButton variant="secondary">Menu</AppButton></Link>
          <AdSlot placement="result" />
        </div>
      </div>
    );
  }

  const q = qs.current[Math.max(0, s.round - 1)]!;
  const optState = (i: number): OptionState => s.phase !== "reveal" ? (s.selected === i ? "selected" : "idle") : i === q.correctIndex ? "correct" : i === s.selected ? "wrong" : "dim";

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="space-y-2.5 px-4 pt-3 safe-top">
        <div className="flex items-center justify-between">
          <span className="rounded-xl bg-cocoa px-3 py-1 font-display text-sm font-extrabold uppercase text-secondary-foreground">{s.round}/{total}</span>
          <TimerCount left={s.phase === "question" ? s.left : 0} />
        </div>
        <GameTimer left={s.phase === "question" ? s.left : 0} total={seconds} />
        <TeamScore a={a} b={b} labelA={isDuel ? teams[0].players[0]!.name : teams[0].name} labelB={isDuel ? teams[1].players[0]!.name : teams[1].name} />
      </div>
      <main className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-8">
        <QuestionCard q={q} />
        <div className="space-y-3">
          {q.options.map((o, i) => <QuizOption key={i} index={i} label={o} state={optState(i)} disabled={s.phase !== "question"} onClick={() => resolve(i)} />)}
        </div>
        {s.phase === "reveal" && (
          <div className="animate-rise grid grid-cols-2 gap-2">
            {teams.map((t) => (
              <div key={t.name} className={cn("rounded-2xl p-3 text-primary-foreground", t.tone === "forest" ? "bg-forest" : "bg-coral")}>
                {t.players.map((p) => <p key={p.id} className="flex justify-between text-sm font-bold"><span>{p.name}</span><span>+{s.last[p.id] ?? 0}</span></p>)}
                {!isDuel && <p className="mt-1 flex justify-between border-t border-primary-foreground/30 pt-1 font-display font-extrabold"><span>Total</span><span>{t.players.reduce((x, p) => x + (s.points[p.id] ?? 0), 0)}</span></p>}
              </div>
            ))}
          </div>
        )}
      </main>
      {s.phase === "countdown" && <CountdownOverlay value={s.count} />}
    </div>
  );
}
