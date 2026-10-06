/**
 * Single source of placeholder question text. Lessons, multiplayer and admin
 * exercises all build from these helpers.
 * NEVER replace with invented Forro — real content comes from the API after linguist review.
 */
import type { Exercise } from "@/types";
import type { QuizQuestion } from "@/types/multiplayer";

export const LETTERS = ["A", "B", "C", "D"] as const;

export const ph = {
  word: (n?: number) => (n ? `Palavra em Forro ${n}` : "Palavra em Forro"),
  expression: (n?: number) => (n ? `Expressão em Forro ${n}` : "Expressão em Forro"),
  phrase: (n: number) => `Frase em Forro ${n}`,
  translation: (n?: number) => (n ? `Tradução em Português ${n}` : "Tradução em Português"),
  option: (l: string) => `Tradução ${l}`,
  audio: "Áudio de exemplo",
  meaningPrompt: (n: number) => `O que significa "${ph.expression(n)}"?`,
  listenPrompt: "Ouve e escolhe a tradução",
};

/** Five placeholder exercises per lesson (one of each main type). */
export function lessonExercises(lessonId: string): Exercise[] {
  const opts = (n: number) => LETTERS.map((l, i) => ({ id: `${lessonId}-${n}-${l}`, label: `Resposta ${l}`, isCorrect: i === 1 }));
  return [
    { id: `${lessonId}-1`, type: "multiple_choice", prompt: "O que significa esta expressão?", targetText: ph.expression(), options: opts(1) },
    { id: `${lessonId}-2`, type: "listen_choose", prompt: ph.listenPrompt, targetText: ph.audio, options: opts(2) },
    { id: `${lessonId}-3`, type: "order_words", prompt: "Ordena as palavras", targetText: ph.translation(), words: ["Palavra 1", "Palavra 2", "Palavra 3", "Palavra 4"], answer: "Palavra 1 Palavra 2 Palavra 3 Palavra 4" },
    { id: `${lessonId}-4`, type: "match_words", prompt: "Liga os pares", pairs: [1, 2, 3].map((n) => ({ left: ph.word(n), right: `Tradução ${n}` })) },
    { id: `${lessonId}-5`, type: "pronunciation", prompt: "Repete a palavra", targetText: ph.word() },
  ];
}

/** Multiplayer quiz pool (deterministic). */
export function buildQuestionPool(count = 40): QuizQuestion[] {
  return Array.from({ length: count }, (_, i) => {
    const listen = i % 6 === 4;
    return {
      id: `mq${i + 1}`,
      type: listen ? "LISTEN_AND_CHOOSE" : "MULTIPLE_CHOICE",
      prompt: listen ? ph.listenPrompt : ph.meaningPrompt(i + 1),
      audioUrl: null,
      options: LETTERS.map(ph.option),
      correctIndex: (i * 7 + 2) % 4,
    };
  });
}
