/**
 * Regras puras das lições (docs/REGRAS_DE_NEGOCIO.md §5). O serviço guarda e aplica;
 * aqui decide-se o que é cada pergunta, quem pode jogar que lição e como se avalia.
 */

/** Palavra disponível para perguntas, já com o significado no idioma de quem joga. */
export interface QuizItem {
  exerciseId: string;
  vocabularyId: string;
  word: string;
  gloss: string;
  partOfSpeech: string;
}

export interface QuestionOption {
  id: string;
  label: string;
}

/** Pergunta guardada no servidor (com a resposta certa). */
export interface StoredQuestion {
  exerciseId: string;
  vocabularyId: string;
  /** "meaning": mostra a palavra e pede o significado; "word": o contrário. */
  mode: "meaning" | "word";
  prompt: string;
  partOfSpeech: string;
  options: QuestionOption[];
  correctOptionId: string;
}

/** O que o cliente recebe antes de responder: sem a resposta certa. */
export type PublicQuestion = Omit<StoredQuestion, "correctOptionId" | "vocabularyId">;

export const toPublicQuestion = ({
  correctOptionId: _c,
  vocabularyId: _v,
  ...q
}: StoredQuestion): PublicQuestion => q;

export type Rand = () => number;

function shuffle<T>(list: T[], rand: Rand): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Uma pergunta por palavra da lição, por ordem baralhada. As respostas erradas vêm do
 * mesmo tema (`pool`), de preferência da mesma classe gramatical, sem significados iguais.
 * Os ids das opções são ids de vocabulário: a resposta certa é a própria palavra.
 */
export function buildQuestions(lesson: QuizItem[], pool: QuizItem[], rand: Rand): StoredQuestion[] {
  return shuffle(lesson, rand).map((item, i) => {
    const mode: StoredQuestion["mode"] = i % 2 === 0 ? "meaning" : "word";
    const differs = (c: QuizItem) =>
      c.vocabularyId !== item.vocabularyId &&
      c.gloss.toLowerCase() !== item.gloss.toLowerCase() &&
      c.word !== item.word;
    const samePos = pool.filter((c) => differs(c) && c.partOfSpeech === item.partOfSpeech);
    const candidates = samePos.length >= 3 ? samePos : pool.filter(differs);
    const unique = new Map<string, QuizItem>();
    for (const c of shuffle(candidates, rand)) {
      const key = (mode === "meaning" ? c.gloss : c.word).toLowerCase();
      if (
        ![...unique.values()].some(
          (u) => (mode === "meaning" ? u.gloss : u.word).toLowerCase() === key,
        )
      ) {
        unique.set(c.vocabularyId, c);
      }
      if (unique.size === 3) break;
    }
    const all = shuffle([item, ...unique.values()], rand);
    return {
      exerciseId: item.exerciseId,
      vocabularyId: item.vocabularyId,
      mode,
      prompt: mode === "meaning" ? item.word : item.gloss,
      partOfSpeech: item.partOfSpeech,
      options: all.map((c) => ({
        id: c.vocabularyId,
        label: mode === "meaning" ? c.gloss : c.word,
      })),
      correctOptionId: item.vocabularyId,
    };
  });
}

/** Estado de uma lição para o utilizador: concluídas repetem-se; só a primeira por fazer abre. */
export function lessonAccess(
  orderedLessonIds: string[],
  completed: ReadonlySet<string>,
  lessonId: string,
): "completed" | "current" | "locked" {
  if (completed.has(lessonId)) return "completed";
  const current = orderedLessonIds.find((id) => !completed.has(id));
  return current === lessonId ? "current" : "locked";
}

export interface AnswerRecord {
  exerciseId: string;
  round: number;
  correct: boolean;
}

/** Abaixo disto (segundos por pergunta, em média) a tentativa é implausível (§5.6). */
export const MIN_SECONDS_PER_QUESTION = 2;

export function evaluateAttempt(input: {
  exerciseIds: string[];
  answers: AnswerRecord[];
  startedAt: Date;
  now: Date;
}) {
  const total = input.exerciseIds.length;
  const solved = new Set(input.answers.filter((a) => a.correct).map((a) => a.exerciseId));
  const correctFirstTry = input.answers.filter((a) => a.round === 1 && a.correct).length;
  const durationSeconds = Math.max(
    0,
    Math.round((input.now.getTime() - input.startedAt.getTime()) / 1000),
  );
  return {
    total,
    allSolved: input.exerciseIds.every((id) => solved.has(id)),
    correctFirstTry,
    accuracy: total ? correctFirstTry / total : 0,
    durationSeconds,
    flagged: durationSeconds < total * MIN_SECONDS_PER_QUESTION,
  };
}
