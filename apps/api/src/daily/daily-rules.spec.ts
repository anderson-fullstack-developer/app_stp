import { compareRank, isImplausible, pickDaily, utcDay } from "./daily-rules.js";

describe("desafio do dia", () => {
  const ids = Array.from({ length: 40 }, (_, i) => `ex-${i}`);

  it("escolhe 5 perguntas, sempre as mesmas para o mesmo dia e língua", () => {
    const a = pickDaily(ids, "kabuverdianu:2026-10-07");
    expect(a).toHaveLength(5);
    expect(new Set(a).size).toBe(5);
    expect(pickDaily([...ids].reverse(), "kabuverdianu:2026-10-07")).toEqual(a);
    expect(pickDaily(ids, "kabuverdianu:2026-10-08")).not.toEqual(a);
  });

  it("o dia é o dia UTC", () => {
    expect(utcDay(new Date("2026-10-07T23:59:59Z"))).toBe("2026-10-07");
    expect(utcDay(new Date("2026-10-08T00:00:00Z"))).toBe("2026-10-08");
  });

  it("ranking: mais certas, depois menos tempo, depois quem acabou primeiro", () => {
    const t = (s: string) => new Date(`2026-10-07T10:00:${s}Z`);
    const rows = [
      { id: "lento", correct: 5, durationMs: 40_000, completedAt: t("40") },
      { id: "erros", correct: 3, durationMs: 10_000, completedAt: t("10") },
      { id: "rapido", correct: 5, durationMs: 20_000, completedAt: t("20") },
      { id: "empate", correct: 5, durationMs: 20_000, completedAt: t("25") },
    ];
    expect([...rows].sort(compareRank).map((r) => r.id)).toEqual([
      "rapido",
      "empate",
      "lento",
      "erros",
    ]);
  });

  it("tempos impossíveis não contam", () => {
    expect(isImplausible(5_000, 5)).toBe(true);
    expect(isImplausible(30_000, 5)).toBe(false);
  });
});
