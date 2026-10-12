import { MULTIPLAYER_CONFIG } from "@stp/config";
import * as engine from "@stp/game-engine";
import {
  ARENA_CONFIG,
  applySurvivalRound,
  createPlayers,
  generateRoomCode,
  normalizeConfig,
  rankRemaining,
  rankDuel,
  rewardEligible,
  scoreAnswer,
  survivalReward,
  type AnswerOutcome,
} from "./survival-rules.js";

describe("Regras da Sobrevivência no servidor", () => {
  it("valores iguais aos do produto (@stp/config)", () => {
    expect(ARENA_CONFIG.playerOptions).toEqual(MULTIPLAYER_CONFIG.playerOptions);
    expect(ARENA_CONFIG.livesOptions).toEqual(MULTIPLAYER_CONFIG.livesOptions);
    expect(ARENA_CONFIG.timeOptions).toEqual(MULTIPLAYER_CONFIG.timeOptions);
    expect(ARENA_CONFIG.defaults).toEqual(MULTIPLAYER_CONFIG.publicSurvival);
    expect(ARENA_CONFIG.maxRounds).toBe(MULTIPLAYER_CONFIG.maxRounds);
    expect(ARENA_CONFIG.survivalRewards).toEqual(MULTIPLAYER_CONFIG.survivalRewards);
    expect(ARENA_CONFIG.participationReward).toEqual(MULTIPLAYER_CONFIG.participationReward);
    expect(ARENA_CONFIG.duel).toEqual(MULTIPLAYER_CONFIG.duel);
    expect(ARENA_CONFIG.scoring).toEqual(MULTIPLAYER_CONFIG.scoring);
    expect(ARENA_CONFIG.matchRewards).toEqual(MULTIPLAYER_CONFIG.matchRewards);
  });

  it("mesmos resultados que o motor partilhado (@stp/game-engine)", () => {
    const ids = ["a", "b", "c", "d"];
    const outcomes: AnswerOutcome[] = ["correct", "wrong", "timeout"];
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    let mine = createPlayers(ids, 2);
    let theirs = engine.createSurvivalPlayers(
      ids.map((id) => ({ id, name: id, color: "ocean" as const })),
      2,
    );
    for (let round = 1; round <= 12; round++) {
      const o = Object.fromEntries(ids.map((id) => [id, outcomes[Math.floor(rand() * 3)]!]));
      const a = applySurvivalRound(mine, o, round);
      const b = engine.applySurvivalRound(theirs, o, round);
      expect(a.summary).toEqual(b.summary);
      expect(a.players.map(({ id, lives, placement }) => ({ id, lives, placement }))).toEqual(
        b.players.map(({ id, lives, placement }) => ({ id, lives, placement })),
      );
      mine = a.players;
      theirs = b.players;
    }
    expect(rankRemaining(mine).map((p) => p.placement)).toEqual(
      engine.rankRemaining(theirs).map((p) => p.placement),
    );
    for (const place of [1, 2, 3, 4, 9]) {
      expect(survivalReward(place)).toEqual(engine.survivalReward(place));
    }
  });

  it("pontos do duelo iguais ao motor partilhado", () => {
    for (const [ok, ratio] of [
      [true, 1],
      [true, 0.5],
      [true, 0],
      [false, 1],
      [true, 2],
    ] as const) {
      expect(scoreAnswer(ok, ratio)).toBe(engine.scoreAnswer(ok, ratio));
    }
  });

  it("duelo: pontos, depois certas, depois tempo; quem sai perde; empate total", () => {
    const base = { correct: 5, answerMs: 20_000, left: false };
    expect([
      ...rankDuel([
        { id: "a", score: 500, ...base },
        { id: "b", score: 600, ...base },
      ]),
    ]).toEqual([
      ["b", 1],
      ["a", 2],
    ]);
    expect(
      rankDuel([
        { id: "a", score: 500, ...base },
        { id: "b", score: 500, ...base, answerMs: 9_000 },
      ]).get("b"),
    ).toBe(1);
    expect(
      rankDuel([
        { id: "a", score: 900, ...base, left: true },
        { id: "b", score: 0, ...base },
      ]).get("b"),
    ).toBe(1);
    const draw = rankDuel([
      { id: "a", score: 500, ...base },
      { id: "b", score: 500, ...base },
    ]);
    expect([draw.get("a"), draw.get("b")]).toEqual([1, 1]);
  });

  it("ronda anulada quando toda a gente morreria", () => {
    const r = applySurvivalRound(createPlayers(["a", "b"], 1), { a: "wrong" }, 1);
    expect(r.summary.voided).toBe(true);
    expect(r.players.every((p) => p.lives === 1)).toBe(true);
  });

  it("configuração do cliente só aceita valores permitidos", () => {
    expect(normalizeConfig({ players: 4, lives: 1, seconds: 5 })).toEqual({
      players: 4,
      lives: 1,
      seconds: 5,
    });
    expect(normalizeConfig({ players: 999, lives: 0, seconds: 1 })).toEqual(ARENA_CONFIG.defaults);
  });

  it("recompensas em salas privadas só com 4+ jogadores reais", () => {
    expect(rewardEligible(true, 3)).toBe(false);
    expect(rewardEligible(true, 4)).toBe(true);
    expect(rewardEligible(false, 2)).toBe(true);
  });

  it("código de sala com 6 caracteres sem ambíguos", () => {
    const code = generateRoomCode(Math.random);
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });
});
