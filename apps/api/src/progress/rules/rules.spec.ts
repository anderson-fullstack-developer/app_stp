import { levelForXp, xpForLevel } from "./levels.js";
import { addDays, daysBetween, isoWeekStartUtc, localDate } from "./local-date.js";
import {
  DEFAULT_REWARD_RULES,
  lessonRewards,
  milestoneAchievements,
  toRewardTable,
} from "./rewards.js";
import { applyActivity, effectiveStreak, type StreakState } from "./streak.js";

const table = toRewardTable(DEFAULT_REWARD_RULES);
const sum = (lines: { xp: number; coins: number }[]) =>
  lines.reduce((a, l) => ({ xp: a.xp + l.xp, coins: a.coins + l.coins }), { xp: 0, coins: 0 });

describe("níveis", () => {
  it("segue a curva da especificação e cresce 20 % depois do nível 5", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(xpForLevel)).toEqual([
      0, 100, 250, 500, 900, 1400, 2000, 2700, 3550, 4550,
    ]);
  });
  it("calcula nível e progresso a partir do XP", () => {
    expect(levelForXp(0)).toMatchObject({ level: 1, progress: 0 });
    expect(levelForXp(99).level).toBe(1);
    expect(levelForXp(100)).toMatchObject({ level: 2, levelStartXp: 100, nextLevelXp: 250 });
    expect(levelForXp(175).progress).toBeCloseTo(0.5);
    expect(levelForXp(4550).level).toBe(10);
  });
});

describe("datas locais", () => {
  it("o dia depende do fuso do utilizador", () => {
    const instant = new Date("2026-10-07T23:30:00Z");
    expect(localDate(instant, "Europe/Lisbon")).toBe("2026-10-08"); // UTC+1 no verão
    expect(localDate(instant, "Africa/Sao_Tome")).toBe("2026-10-07"); // UTC+0
    expect(localDate(instant, "Atlantic/Cape_Verde")).toBe("2026-10-07"); // UTC−1
  });
  it("conta dias de calendário e semanas ISO (segunda, UTC)", () => {
    expect(daysBetween("2026-02-28", "2026-03-01")).toBe(1);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(isoWeekStartUtc(new Date("2026-10-11T22:00:00Z")).toISOString()).toBe(
      "2026-10-05T00:00:00.000Z",
    );
  });
});

describe("streak", () => {
  const s = (o: Partial<StreakState> = {}): StreakState => ({
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    streakFreezes: 0,
    ...o,
  });

  it("primeira atividade começa em 1; dia seguinte soma; mesmo dia não conta", () => {
    const a = applyActivity(s(), "2026-10-07");
    expect(a.state).toMatchObject({ currentStreak: 1, longestStreak: 1 });
    const b = applyActivity(a.state, "2026-10-08");
    expect(b.state.currentStreak).toBe(2);
    const c = applyActivity(b.state, "2026-10-08");
    expect(c.counted).toBe(false);
    expect(c.state.currentStreak).toBe(2);
  });

  it("proteções cobrem dias falhados só se chegarem para todos", () => {
    const base = s({
      currentStreak: 10,
      longestStreak: 10,
      lastActiveDate: "2026-10-01",
      streakFreezes: 1,
    });
    const covered = applyActivity(base, "2026-10-03"); // falhou 1 dia
    expect(covered.state).toMatchObject({ currentStreak: 11, streakFreezes: 0 });
    expect(covered.frozenDays).toEqual(["2026-10-02"]);

    const notCovered = applyActivity(base, "2026-10-04"); // falhou 2, só 1 proteção
    expect(notCovered.state).toMatchObject({
      currentStreak: 1,
      streakFreezes: 1,
      longestStreak: 10,
    });
    expect(notCovered.frozenDays).toEqual([]);
  });

  it("relógio para trás (mudança de fuso) não conta", () => {
    const base = s({ currentStreak: 3, longestStreak: 3, lastActiveDate: "2026-10-08" });
    expect(applyActivity(base, "2026-10-07").counted).toBe(false);
  });

  it("a streak perdida vê-se ao abrir a app", () => {
    const st = s({ currentStreak: 5, lastActiveDate: "2026-10-05", streakFreezes: 1 });
    expect(effectiveStreak(st, "2026-10-06")).toBe(5);
    expect(effectiveStreak(st, "2026-10-07")).toBe(5); // 1 dia coberto
    expect(effectiveStreak(st, "2026-10-08")).toBe(0);
  });
});

describe("recompensas de lição", () => {
  it("primeira conclusão: 10/certa + 30 + 5 moedas; perfeita +20", () => {
    expect(
      sum(lessonRewards({ total: 10, correctFirstTry: 8, firstCompletion: true }, table)),
    ).toEqual({ xp: 110, coins: 5 });
    expect(
      sum(lessonRewards({ total: 10, correctFirstTry: 10, firstCompletion: true }, table)),
    ).toEqual({ xp: 150, coins: 5 });
  });
  it("repetição: 50 % do XP, sem moedas nem bónus de perfeita", () => {
    expect(
      sum(lessonRewards({ total: 10, correctFirstTry: 10, firstCompletion: false }, table)),
    ).toEqual({ xp: 65, coins: 0 });
  });
  it("recusa contagens impossíveis", () => {
    expect(() =>
      lessonRewards({ total: 5, correctFirstTry: 6, firstCompletion: true }, table),
    ).toThrow();
  });
  it("conquistas de marcos", () => {
    expect(
      milestoneAchievements({
        currentStreak: 30,
        correctAnswers: 120,
        lessonsCompleted: 3,
        level: 10,
      }),
    ).toEqual([
      "ACH_FIRST_LESSON",
      "ACH_STREAK_7",
      "ACH_STREAK_30",
      "ACH_CORRECT_100",
      "ACH_LEVEL_10",
    ]);
  });
});
