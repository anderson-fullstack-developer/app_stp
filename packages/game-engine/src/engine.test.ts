import { describe, expect, it } from "vitest";
import { MULTIPLAYER_CONFIG } from "@stp/config";
import { applySurvivalRound, createSurvivalPlayers, scoreAnswer, survivalReward } from "./index";

const seeds = [
  { id: "me", name: "Anderson", color: "forest" as const, isMe: true },
  { id: "a", name: "Maria", color: "coral" as const },
  { id: "b", name: "João", color: "ocean" as const },
];

describe("survival rules", () => {
  it("public survival defaults to 8 players and 3 lives", () => {
    expect(MULTIPLAYER_CONFIG.publicSurvival.players).toBe(8);
    expect(MULTIPLAYER_CONFIG.publicSurvival.lives).toBe(3);
  });
  it("wrong answer costs 1 life", () => {
    const { players } = applySurvivalRound(createSurvivalPlayers(seeds, 3), { me: "wrong", a: "correct", b: "correct" }, 1);
    expect(players.find((p) => p.id === "me")!.lives).toBe(2);
  });
  it("timeout costs 1 life", () => {
    const { players } = applySurvivalRound(createSurvivalPlayers(seeds, 3), { me: "timeout", a: "correct", b: "correct" }, 1);
    expect(players.find((p) => p.id === "me")!.lives).toBe(2);
  });
  it("correct answer keeps lives", () => {
    const { players } = applySurvivalRound(createSurvivalPlayers(seeds, 3), { me: "correct", a: "correct", b: "correct" }, 1);
    expect(players.find((p) => p.id === "me")!.lives).toBe(3);
  });
  it("0 lives means eliminated, last one standing wins", () => {
    const { players, summary } = applySurvivalRound(createSurvivalPlayers(seeds, 1), { me: "correct", a: "wrong", b: "timeout" }, 1);
    expect(summary.eliminated.sort()).toEqual(["a", "b"]);
    expect(players.find((p) => p.id === "me")!.placement).toBe(1);
  });
  it("rewards: 1st +250 XP +50, 2nd +150 XP +30, 3rd +100 XP +20", () => {
    expect(survivalReward(1)).toEqual({ xp: 250, coins: 50 });
    expect(survivalReward(2)).toEqual({ xp: 150, coins: 30 });
    expect(survivalReward(3)).toEqual({ xp: 100, coins: 20 });
  });
  it("1v1/2v2 scoring gives 0 for wrong and more for faster correct answers", () => {
    expect(scoreAnswer(false, 1)).toBe(0);
    expect(scoreAnswer(true, 1)).toBeGreaterThan(scoreAnswer(true, 0.1));
  });
});
