import { buildThemedCourse, playableItems, shortGloss, type VocabItem } from "./course-builder.js";

const v = (id: string, word: string, partOfSpeech: VocabItem["partOfSpeech"], glossEn: string) => ({
  id,
  word,
  partOfSpeech,
  glossEn,
});

describe("construtor de cursos por temas", () => {
  it("limpa significados e ignora palavras que não dão boas perguntas", () => {
    expect(shortGloss("(of a person) tall, high")).toBe("tall");
    const items = playableItems([
      v("1", "kasa", "NOUN", "house"),
      v("2", "kaza", "NOUN", "house"), // significado repetido → fora
      v("3", "ai", "INTERJECTION", "oh"), // classe não jogável → fora
      v("4", "x", "NOUN", "a very long meaning that will not fit in a button"),
    ]);
    expect(items.map((i) => i.id)).toEqual(["1"]);
  });

  it("agrupa por tema, divide em lições e junta sobras pequenas à lição anterior", () => {
    const nums = Array.from({ length: 10 }, (_, i) => v(`n${i}`, `num${i}`, "NUMERAL", `n-${i}`));
    const nouns = Array.from({ length: 3 }, (_, i) => v(`s${i}`, `sub${i}`, "NOUN", `s-${i}`));
    const units = buildThemedCourse(
      [...nums, ...nouns],
      [
        { id: "numbers", icon: "🔢", pos: ["numeral"] },
        { id: "things", icon: "🏠", pos: ["substantivo"] }, // só 3 palavras → sem unidade
      ],
      8,
    );
    expect(units).toHaveLength(1);
    expect(units[0]).toMatchObject({ slug: "numbers", icon: "🔢", order: 0 });
    // 10 palavras com 8 por lição: 8 + 2 → o resto (2 < 4) junta-se à primeira.
    expect(units[0]!.lessons.map((l) => [l.slug, l.vocabularyIds.length])).toEqual([
      ["numbers-1", 10],
    ]);
  });

  it("cada palavra entra num só tema e o resultado é determinístico", () => {
    const items = Array.from({ length: 20 }, (_, i) => v(`a${i}`, `w${i}`, "ADJECTIVE", `g-${i}`));
    const themes = [
      { id: "colors", icon: "🎨", pos: ["adjetivo"], glosses: ["g-1", "g-2", "g-3", "g-4"] },
      { id: "describe", icon: "✨", pos: ["adjetivo"] },
    ];
    const a = buildThemedCourse(items, themes, 8);
    expect(a.map((u) => u.slug)).toEqual(["colors", "describe"]);
    const all = a.flatMap((u) => u.lessons.flatMap((l) => l.vocabularyIds));
    expect(new Set(all).size).toBe(20);
    expect(buildThemedCourse(items, themes, 8)).toEqual(a);
  });
});
