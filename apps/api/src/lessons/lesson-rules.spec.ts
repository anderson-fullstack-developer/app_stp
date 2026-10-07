import {
  buildQuestions,
  evaluateAttempt,
  lessonAccess,
  type QuizItem,
  toPublicQuestion,
} from "./lesson-rules.js";

const item = (n: number, pos = "NOUN"): QuizItem => ({
  exerciseId: `e${n}`,
  vocabularyId: `v${n}`,
  word: `palavra${n}`,
  gloss: `significado ${n}`,
  partOfSpeech: pos,
});

function seeded(seed = 42) {
  let a = seed;
  return () => {
    a = (a * 16807) % 2147483647;
    return a / 2147483647;
  };
}

describe("perguntas das lições", () => {
  const pool = Array.from({ length: 10 }, (_, i) => item(i));
  const lesson = pool.slice(0, 5);

  it("uma pergunta por palavra, 4 opções distintas e a certa entre elas", () => {
    const qs = buildQuestions(lesson, pool, seeded());
    expect(qs).toHaveLength(5);
    expect(new Set(qs.map((q) => q.exerciseId)).size).toBe(5);
    for (const q of qs) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options.map((o) => o.id)).size).toBe(4);
      expect(q.options.some((o) => o.id === q.correctOptionId)).toBe(true);
      const right = q.options.find((o) => o.id === q.correctOptionId)!;
      const source = pool.find((p) => p.vocabularyId === q.vocabularyId)!;
      expect(right.label).toBe(q.mode === "meaning" ? source.gloss : source.word);
      expect(q.prompt).toBe(q.mode === "meaning" ? source.word : source.gloss);
    }
    expect(qs.map((q) => q.mode)).toEqual(["meaning", "word", "meaning", "word", "meaning"]);
  });

  it("prefere respostas erradas da mesma classe gramatical", () => {
    const mixed = [
      ...Array.from({ length: 5 }, (_, i) => item(i, "NOUN")),
      ...Array.from({ length: 5 }, (_, i) => item(i + 10, "VERB")),
    ];
    const qs = buildQuestions([mixed[0]!], mixed, seeded(7));
    const posOf = new Map(mixed.map((m) => [m.vocabularyId, m.partOfSpeech]));
    expect(qs[0]!.options.every((o) => posOf.get(o.id) === "NOUN")).toBe(true);
  });

  it("a versão pública não revela a resposta", () => {
    const [q] = buildQuestions(lesson, pool, seeded());
    const pub = toPublicQuestion(q!);
    expect(pub).not.toHaveProperty("correctOptionId");
    expect(pub).not.toHaveProperty("vocabularyId");
  });
});

describe("acesso às lições", () => {
  const order = ["l1", "l2", "l3"];
  it("concluídas repetem-se, a primeira por fazer abre, o resto fica fechado", () => {
    const done = new Set(["l1"]);
    expect(lessonAccess(order, done, "l1")).toBe("completed");
    expect(lessonAccess(order, done, "l2")).toBe("current");
    expect(lessonAccess(order, done, "l3")).toBe("locked");
    expect(lessonAccess(order, new Set(), "l1")).toBe("current");
  });
});

describe("avaliação da tentativa", () => {
  const startedAt = new Date("2026-10-07T10:00:00Z");
  const ids = ["a", "b", "c", "d"];
  it("conta certas à primeira, exige todas resolvidas e marca tempos impossíveis", () => {
    const answers = [
      { exerciseId: "a", round: 1, correct: true },
      { exerciseId: "b", round: 1, correct: false },
      { exerciseId: "b", round: 2, correct: true },
      { exerciseId: "c", round: 1, correct: true },
    ];
    const partial = evaluateAttempt({
      exerciseIds: ids,
      answers,
      startedAt,
      now: new Date("2026-10-07T10:01:00Z"),
    });
    expect(partial).toMatchObject({ allSolved: false, correctFirstTry: 2 });

    const full = [...answers, { exerciseId: "d", round: 1, correct: true }];
    const ok = evaluateAttempt({
      exerciseIds: ids,
      answers: full,
      startedAt,
      now: new Date("2026-10-07T10:01:00Z"),
    });
    expect(ok).toMatchObject({
      allSolved: true,
      correctFirstTry: 3,
      accuracy: 0.75,
      durationSeconds: 60,
      flagged: false,
    });

    const tooFast = evaluateAttempt({
      exerciseIds: ids,
      answers: full,
      startedAt,
      now: new Date("2026-10-07T10:00:05Z"),
    });
    expect(tooFast.flagged).toBe(true);
  });
});
