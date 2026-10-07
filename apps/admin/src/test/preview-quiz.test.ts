import { describe, expect, it } from "vitest";
import data from "@content/sources/wiktionary-kea/entries.json";
import pt from "@content/sources/wiktionary-kea/pt-suggestions.json";
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

  it("em português usa as sugestões e deixa de fora as duvidosas", () => {
    const quiz = buildPreviewQuiz(entries, 10, 3, { locale: "pt", ptSuggestions: pt.translations });
    expect(quiz).toHaveLength(10);
    const ptValues = new Set(Object.values(pt.translations as Record<string, string>));
    for (const q of quiz) {
      expect(q.meaningSource).toBe("pt-suggestion");
      const meanings = q.mode === "meaning" ? q.options : [q.target];
      for (const m of meanings) {
        expect(ptValues.has(m)).toBe(true);
        expect(m).not.toContain("confirmar");
      }
    }
  });

  it("em inglês mostra o significado original da fonte", () => {
    const quiz = buildPreviewQuiz(entries, 10, 3, { locale: "en" });
    expect(quiz.every((q) => q.meaningSource === "en-source")).toBe(true);
  });
});
