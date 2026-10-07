import { useBlockAds } from "@/config/ads";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useReducer, useRef } from "react";
import { MatchmakingScreen } from "@/components/play/LobbyUI";
import {
  AnswerFeedback, CountdownOverlay, FinalBattle, LivesIndicator, MatchTopBar, PlayerEliminatedOverlay,
  PlayersPanel, QuestionCard, QuizOption, RoundResult, WinnerOverlay, type OptionState,
} from "@/components/play/MatchUI";
import { MULTIPLAYER_CONFIG } from "@stp/config";
import { listOpponents, opponentSkill } from "@/services/game.service";
import { game } from "@/hooks/use-game";
import { PhoneFrame } from "@/layouts/AppShell";
import {
  accuracy, alivePlayers, applySurvivalRound, botOutcomes, createRng, createSurvivalPlayers, rankRemaining, simulateToEnd, survivalReward,
} from "@stp/game-engine";
import { session } from "@/lib/multiplayer/session-store";
import { sound } from "@/lib/sound";
import { multiplayerService } from "@/services/game.service";
import type { AnswerOutcome, MatchConfig, MatchPlayerSeed, RoundSummary, SurvivalPlayer } from "@stp/types/multiplayer";

export const Route = createFileRoute("/play/survival")({
  head: () => ({
    meta: [
      { title: "Sobrevivência Online — Língua STP" },
      { name: "description", content: "Responde ao mesmo quiz que todos. Perde vidas ao errar. O último sobrevivente vence." },
      { property: "og:title", content: "Sobrevivência Online — Língua STP" },
      { property: "og:description", content: "Sê o último sobrevivente." },
    ],
  }),
  component: Survival,
});

type Phase = "searching" | "full" | "countdown" | "final" | "question" | "feedback" | "summary" | "eliminated" | "winner";

interface MatchRef {
  phase: Phase;
  config: MatchConfig;
  seeds: MatchPlayerSeed[];
  players: SurvivalPlayer[];
  round: number;
  count: number | "go";
  left: number;
  deadline: number;
  selected: number | null;
  myOutcome: AnswerOutcome | null;
  summary: RoundSummary | null;
  spectator: boolean;
  elimSeen: boolean;
  finalShown: boolean;
}

const skillOf = (id: string) => opponentSkill(id);

function Survival() {
  useBlockAds("multiplayer");
  const navigate = useNavigate();
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const rng = useRef(createRng());
  const questions = useRef(multiplayerService.getQuestions(MULTIPLAYER_CONFIG.maxRounds));
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const m = useRef<MatchRef>({
    phase: "searching", config: { ...MULTIPLAYER_CONFIG.publicSurvival }, seeds: [], players: [], round: 0, count: 3,
    left: 0, deadline: 0, selected: null, myOutcome: null, summary: null, spectator: false, elimSeen: false, finalShown: false,
  });
  const s = m.current;
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };
  const go = (patch: Partial<MatchRef>) => { Object.assign(m.current, patch); bump(); };

  // ---- flow ----
  const finish = (players: SurvivalPlayer[]) => {
    const ranked = rankRemaining(players).sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99));
    const me = ranked.find((p) => p.isMe)!;
    const place = me.placement ?? ranked.length;
    const reward = survivalReward(place);
    const answered = me.correct + me.wrong + me.timeouts;
    game.addXp(reward.xp); game.addCoins(reward.coins);
    session.setPending(null);
    session.setResult({
      mode: "survival", myPlace: place, reward,
      standings: ranked.map((p) => ({ id: p.id, name: p.name, color: p.color, place: p.placement ?? 0, isMe: p.isMe, detail: `${p.correct} certas` })),
      stats: { questions: answered, correct: me.correct, wrong: me.wrong, timeouts: me.timeouts, accuracy: accuracy(me.correct, answered) },
    });
    navigate({ to: "/play/results" });
  };

  const startQuestion = () => {
    const sec = m.current.config.seconds;
    go({ phase: "question", round: m.current.round + 1, selected: null, myOutcome: null, left: sec, deadline: Date.now() + sec * 1000 });
  };

  const next = () => {
    const { players, spectator, elimSeen, finalShown } = m.current;
    const me = players.find((p) => p.isMe)!;
    const alive = alivePlayers(players);
    if (me.lives === 0 && !spectator && !elimSeen) return go({ phase: "eliminated", elimSeen: true });
    if (alive.length <= 1) { go({ phase: "winner" }); return later(() => finish(m.current.players), 3200); }
    if (alive.length === 2 && !finalShown) { go({ phase: "final", finalShown: true }); return later(startQuestion, 2600); }
    startQuestion();
  };

  const resolve = (choice: number | null) => {
    const cur = m.current;
    if (cur.phase !== "question") return;
    const q = questions.current[(cur.round - 1) % questions.current.length]!;
    const me = cur.players.find((p) => p.isMe)!;
    const outcomes = botOutcomes(cur.players, rng.current);
    let myOutcome: AnswerOutcome | null = null;
    if (me.lives > 0) {
      myOutcome = choice === null ? "timeout" : choice === q.correctIndex ? "correct" : "wrong";
      outcomes[me.id] = myOutcome;
      void multiplayerService.submitAnswer("mock", q.id, choice);
    }
    const { players, summary } = applySurvivalRound(cur.players, outcomes, cur.round);
    go({ phase: "feedback", players, summary, myOutcome, selected: choice });
    later(() => go({ phase: "summary" }), 1700);
    later(next, 1700 + 2400);
  };

  // ---- setup: private room hand-off or public matchmaking ----
  useEffect(() => {
    const pending = session.peekPending();
    if (pending) {
      const seeds = pending.members.map((mb) => ({ id: mb.id, name: mb.name, color: mb.color, isMe: mb.isMe, skill: skillOf(mb.id) }));
      go({ config: pending.config, seeds, phase: "full" });
    } else {
      const size = m.current.config.players;
      const cancel = multiplayerService.findMatch(size, {
        onPlayer: (p) => go({ seeds: [...m.current.seeds, p] }),
        onFull: () => go({ phase: "full" }),
      });
      return () => { cancel(); timers.current.forEach(clearTimeout); };
    }
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // full → countdown
  useEffect(() => {
    if (s.phase !== "full") return;
    const t = setTimeout(() => go({ phase: "countdown", count: 3, players: createSurvivalPlayers(m.current.seeds, m.current.config.lives) }), 1400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase]);

  // countdown ticks
  useEffect(() => {
    if (s.phase !== "countdown") return;
    const t = setTimeout(() => {
      const c = m.current.count;
      if (c === "go") startQuestion();
      else go({ count: c > 1 ? c - 1 : "go" });
    }, 850);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase, s.count]);

  // question timer
  useEffect(() => {
    if (s.phase !== "question") return;
    const spectatorAt = m.current.spectator ? Math.min(4, m.current.config.seconds) * 1000 : Infinity;
    const started = Date.now();
    const id = setInterval(() => {
      const left = Math.max(0, (m.current.deadline - Date.now()) / 1000);
      go({ left });
      if (left <= 0 || Date.now() - started >= spectatorAt) { clearInterval(id); resolve(null); }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase, s.round]);

  // efeitos sonoros por mudança de fase (só apresentação — não altera regras)
  useEffect(() => {
    const me = s.players.find((p) => p.isMe);
    if (s.phase === "feedback") sound.play(s.myOutcome === "correct" ? "correct" : "lifeLost");
    else if (s.phase === "eliminated") sound.play("eliminated");
    else if (s.phase === "final") sound.play("final");
    else if (s.phase === "winner") { if (me && me.lives > 0) sound.play("victory"); else if (!s.spectator) sound.play("defeat"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase]);
  // últimos 3 segundos da pergunta
  const secLeft = Math.ceil(s.left);
  useEffect(() => {
    if (s.phase === "question" && secLeft > 0 && secLeft <= 3) sound.play("urgent");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secLeft]);

  // ---- render ----
  const cancelSearch = async () => { await multiplayerService.cancelMatch(); navigate({ to: "/challenges" }); };

  if (s.phase === "searching" || (s.phase === "full" && s.players.length === 0)) {
    return <PhoneFrame><MatchmakingScreen players={s.seeds} size={s.config.players} full={s.phase === "full"} onCancel={cancelSearch} /></PhoneFrame>;
  }

  const me = s.players.find((p) => p.isMe)!;
  const alive = alivePlayers(s.players);
  const q = questions.current[Math.max(0, s.round - 1) % questions.current.length]!;
  const reveal = s.phase !== "question";
  const canAnswer = s.phase === "question" && me.lives > 0 && s.selected === null;
  const names = Object.fromEntries(s.players.map((p) => [p.id, p.name]));
  const optState = (i: number): OptionState => {
    if (!reveal) return s.selected === i ? "selected" : "idle";
    if (i === q.correctIndex) return "correct";
    if (i === s.selected) return "wrong";
    return "dim";
  };

  return (
    <PhoneFrame className="bg-muted">
      {s.round > 0 && (
        <>
          <MatchTopBar round={s.round} alive={alive.length} left={s.phase === "question" ? s.left : 0} total={s.config.seconds} spectator={s.spectator} />
          <main className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-28">
            {me.lives > 0 && <div className="flex justify-center"><LivesIndicator lives={me.lives} max={s.config.lives} size={28} /></div>}
            <QuestionCard q={q} />
            <div className="space-y-3">
              {q.options.map((o, i) => (
                <QuizOption key={i} index={i} label={o} state={optState(i)} disabled={!canAnswer} onClick={() => { if (canAnswer) resolve(i); }} />
              ))}
            </div>
            {s.spectator && (
              <button type="button" onClick={() => finish(simulateToEnd(m.current.players, m.current.round, rng.current))} className="mx-auto text-sm font-bold text-muted-foreground underline">Sair da partida</button>
            )}
          </main>
          <PlayersPanel players={s.players} maxLives={s.config.lives} />
        </>
      )}

      {s.phase === "countdown" && <CountdownOverlay value={s.count} title={s.round === 0 ? "Sala completa!" : undefined} />}
      {s.phase === "feedback" && s.myOutcome && <AnswerFeedback kind={s.myOutcome} lives={me.lives} maxLives={s.config.lives} />}
      {s.phase === "summary" && s.summary && <RoundResult summary={s.summary} survivors={alive} names={names} />}
      {s.phase === "eliminated" && (
        <PlayerEliminatedOverlay place={me.placement ?? s.players.length} correct={me.correct} wrong={me.wrong + me.timeouts}
          onWatch={() => { go({ spectator: true }); next(); }}
          onLeave={() => finish(simulateToEnd(m.current.players, m.current.round, rng.current))} />
      )}
      {s.phase === "final" && alive.length === 2 && <FinalBattle a={alive.find((p) => p.isMe) ?? alive[0]!} b={alive.find((p) => !p.isMe && p !== (alive.find((x) => x.isMe) ?? alive[0])) ?? alive[1]!} maxLives={s.config.lives} />}
      {s.phase === "winner" && alive[0] && <WinnerOverlay name={alive[0].name} color={alive[0].color} isMe={alive[0].isMe} />}
    </PhoneFrame>
  );
}
