import { describe, expect, it } from "vitest";
import data from "@content/sources/wiktionary-kea/entries.json";
import { buildPreviewQuiz, shortGloss, toCards, type SourceEntry } from "@/lib/preview-quiz";

const entries = data.entries as SourceEntry[];

describe("quiz de pré-visualização", () => {
  it("encurta significados", () => {
    expect(shortGloss("(of a person) tall, high")).toBe("tall");
    expect(shortGloss("water")).toBe("water");
  });

  it("só usa palavras com significado curto e sem significados repetidos", () => {
    const cards = toCards(entries);
    expect(cards.length).toBeGreaterThan(200);
    const keys = cards.map((c) => `${c.pos}:${c.gloss.toLowerCase()}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gera 10 perguntas com 4 opções distintas e a resposta certa da fonte", () => {
    const quiz = buildPreviewQuiz(entries, 10, 42);
    expect(quiz).toHaveLength(10);
    const byWord = new Map(toCards(entries).map((c) => [c.word, c]));
    for (const q of quiz) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      const answer = q.options[q.correctIndex]!;
      const word = q.mode === "meaning" ? q.target : answer;
      const gloss = q.mode === "meaning" ? answer : q.target;
      expect(byWord.get(word)?.gloss).toBe(gloss);
    }
  });

  it("a mesma semente dá o mesmo quiz", () => {
    expect(buildPreviewQuiz(entries, 10, 7)).toEqual(buildPreviewQuiz(entries, 10, 7));
  });
});
