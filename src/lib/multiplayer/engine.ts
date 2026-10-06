/**
 * Pure match rules. Today they drive the mock simulation; later the NestJS server
 * becomes the authority and the client only renders server events.
 */
import { MULTIPLAYER_CONFIG } from "@/config/app";
import type { AnswerOutcome, MatchPlayerSeed, Reward, RoundSummary, SurvivalPlayer } from "@/types/multiplayer";

export type Rng = () => number;

export function createRng(seed = Date.now()): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSurvivalPlayers(seeds: MatchPlayerSeed[], lives: number): SurvivalPlayer[] {
  return seeds.map((s) => ({ ...s, lives, correct: 0, wrong: 0, timeouts: 0, eliminatedRound: null, placement: null }));
}

export const alivePlayers = (players: SurvivalPlayer[]) => players.filter((p) => p.lives > 0);

export function simulateBotOutcome(skill: number, rng: Rng): AnswerOutcome {
  const r = rng();
  if (r < skill) return "correct";
  return rng() < 0.25 ? "timeout" : "wrong";
}

/** Correct keeps lives; wrong or timeout costs 1 life; 0 lives = eliminated. */
export function applySurvivalRound(
  players: SurvivalPlayer[],
  outcomes: Record<string, AnswerOutcome>,
  round: number,
): { players: SurvivalPlayer[]; summary: RoundSummary } {
  const alive = alivePlayers(players);
  const counts = { correct: 0, wrong: 0, noAnswer: 0 };
  alive.forEach((p) => {
    const o = outcomes[p.id] ?? "timeout";
    if (o === "correct") counts.correct++; else if (o === "wrong") counts.wrong++; else counts.noAnswer++;
  });
  const wouldDie = alive.filter((p) => (outcomes[p.id] ?? "timeout") !== "correct" && p.lives === 1);
  const voided = wouldDie.length === alive.length && alive.length > 0;

  const eliminated: string[] = [];
  const next = players.map((p) => {
    if (p.lives <= 0) return p;
    const o = outcomes[p.id] ?? "timeout";
    const stat = o === "correct" ? { correct: p.correct + 1 } : o === "wrong" ? { wrong: p.wrong + 1 } : { timeouts: p.timeouts + 1 };
    const lives = o === "correct" || voided ? p.lives : p.lives - 1;
    if (lives === 0) eliminated.push(p.id);
    return { ...p, ...stat, lives, eliminatedRound: lives === 0 ? round : p.eliminatedRound };
  });

  // Players eliminated in the same round share the lowest free places, best-to-worst by order.
  const aliveAfter = alive.length - eliminated.length;
  let place = alive.length;
  const placed = next.map((p) => (eliminated.includes(p.id) ? { ...p, placement: place-- } : p));
  const final = aliveAfter === 1 ? placed.map((p) => (p.lives > 0 ? { ...p, placement: 1 } : p)) : placed;

  return { players: final, summary: { round, ...counts, eliminated, alive: aliveAfter, voided } };
}

export function botOutcomes(players: SurvivalPlayer[], rng: Rng): Record<string, AnswerOutcome> {
  const out: Record<string, AnswerOutcome> = {};
  alivePlayers(players).forEach((p) => { if (!p.isMe) out[p.id] = simulateBotOutcome(p.skill ?? 0.6, rng); });
  return out;
}

/** Fast-forward the rest of the match (used when an eliminated player leaves). */
export function simulateToEnd(players: SurvivalPlayer[], fromRound: number, rng: Rng): SurvivalPlayer[] {
  let ps = players;
  let round = fromRound;
  while (alivePlayers(ps).length > 1 && round < fromRound + MULTIPLAYER_CONFIG.maxRounds) {
    round++;
    ps = applySurvivalRound(ps, botOutcomes(ps, rng), round).players;
  }
  return rankRemaining(ps);
}

/** Safety: if rounds run out, rank survivors by lives. */
export function rankRemaining(players: SurvivalPlayer[]): SurvivalPlayer[] {
  const alive = alivePlayers(players).sort((a, b) => b.lives - a.lives || b.correct - a.correct);
  return players.map((p) => (p.placement ? p : { ...p, placement: alive.findIndex((a) => a.id === p.id) + 1 }));
}

/** Points for 1v1 / 2v2: correctness + speed. timeLeftRatio in [0,1]. */
export function scoreAnswer(correct: boolean, timeLeftRatio: number): number {
  if (!correct) return 0;
  const { base, maxSpeedBonus } = MULTIPLAYER_CONFIG.scoring;
  return base + Math.round(maxSpeedBonus * Math.min(1, Math.max(0, timeLeftRatio)));
}

export function survivalReward(place: number): Reward {
  const r = MULTIPLAYER_CONFIG.survivalRewards.find((x) => x.place === place);
  return r ? { xp: r.xp, coins: r.coins } : { ...MULTIPLAYER_CONFIG.participationReward };
}

export const accuracy = (correct: number, total: number) => (total ? Math.round((correct / total) * 100) : 0);
