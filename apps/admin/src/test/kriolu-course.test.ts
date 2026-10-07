import { describe, expect, it } from "vitest";
import data from "@content/sources/wiktionary-kea/entries.json";
import pt from "@content/sources/wiktionary-kea/pt-suggestions.json";
import { lessonStates } from "@/hooks/use-kriolu";
import {
  buildKrioluCourse,
  buildKrioluLessonQuiz,
  QUESTIONS_PER_LESSON,
} from "@/lib/kriolu-course";
import { languages } from "@/mocks/languages";
import type { SourceEntry } from "@/lib/preview-quiz";

const entries = data.entries as SourceEntry[];

describe("curso de Kriolu (Beta)", () => {
  for (const locale of ["pt", "en"] as const) {
    it(`monta unidades por tema com lições de 4 a ${QUESTIONS_PER_LESSON * 2} palavras (${locale})`, () => {
      const units = buildKrioluCourse(entries, locale, pt.translations);
      expect(units.length).toBeGreaterThanOrEqual(6);
      expect(units[0]!.theme.id).toBe("numbers");
      const all = units.flatMap((u) => u.lessons.flatMap((l) => l.words));
      expect(new Set(all).size).toBe(all.length); // cada palavra só numa lição
      for (const u of units)
        for (const l of u.lessons) {
          expect(l.words.length).toBeGreaterThanOrEqual(4);
          expect(l.words.length).toBeLessThan(QUESTIONS_PER_LESSON * 2);
        }
    });
  }

  it("cada lição pergunta só as palavras dessa lição", () => {
    const units = buildKrioluCourse(entries, "pt", pt.translations);
    const unit = units[1]!;
    const lesson = unit.lessons[0]!;
    const quiz = buildKrioluLessonQuiz(
      entries,
      lesson,
      unit.lessons.flatMap((l) => l.words),
      "pt",
      pt.translations,
      9,
    );
    expect(quiz.length).toBeGreaterThanOrEqual(4);
    for (const q of quiz) {
      const word = q.mode === "meaning" ? q.target : q.options[q.correctIndex]!;
      expect(lesson.words).toContain(word);
      expect(new Set(q.options).size).toBe(4);
    }
  });

  it("lições em sequência: só a primeira por fazer fica desbloqueada", () => {
    const units = buildKrioluCourse(entries, "pt", pt.translations);
    const first = units[0]!.lessons[0]!.id;
    const second = units[0]!.lessons[1]!.id;
    const s0 = lessonStates(units, []);
    expect(s0.get(first)).toBe("current");
    expect(s0.get(second)).toBe("locked");
    const s1 = lessonStates(units, [first]);
    expect(s1.get(first)).toBe("completed");
    expect(s1.get(second)).toBe("current");
  });

  it("o Kriolu está disponível e identificado como Beta (ADR-14)", () => {
    const kea = languages.find((l) => l.id === "kabuverdianu");
    expect(kea?.available).toBe(true);
    expect(kea?.beta).toBe(true);
    expect(languages.find((l) => l.id === "forro")?.beta).toBeUndefined();
  });
});
