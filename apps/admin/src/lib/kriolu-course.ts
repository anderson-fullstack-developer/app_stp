/**
 * Curso de Kriolu (Cabo Verde) em BETA, montado a partir dos rascunhos importados do Wiktionary.
 *
 * Decisão do dono do produto (2026-10-07, ADR-14): o Kriolu fica disponível aos utilizadores
 * antes da revisão por falantes nativos, sempre identificado como "Beta — conteúdo em revisão".
 * Os temas agrupam palavras pelo significado em inglês (organização, não criação de conteúdo).
 */
import {
  buildPreviewQuiz,
  type MeaningLocale,
  type PreviewQuestion,
  type PtSuggestions,
  type SourceEntry,
  shortGloss,
  toCards,
} from "./preview-quiz";
import themesData from "@content/courses/kabuverdianu/themes.json";

export const KRIOLU_LANGUAGE_ID = "kabuverdianu";
const PLAYABLE = ["substantivo", "verbo", "adjetivo", "advérbio", "numeral"];
export const QUESTIONS_PER_LESSON = themesData.wordsPerLesson;

export interface ThemeDef {
  id: string;
  icon: string;
  /** Classes gramaticais aceites no tema. */
  pos?: string[];
  /** Significados (em inglês) que pertencem ao tema. Vazio = todos os da classe. */
  glosses?: string[];
}

/** Temas partilhados com o seed da API (content/courses/kabuverdianu/themes.json). */
export const THEMES = themesData.themes as ThemeDef[];

export interface KrioluLesson {
  id: string;
  themeId: string;
  index: number;
  words: string[];
}

export interface KrioluUnit {
  theme: ThemeDef;
  lessons: KrioluLesson[];
}

/** Monta as unidades e lições (determinístico) para o idioma de quem joga. */
export function buildKrioluCourse(
  entries: SourceEntry[],
  locale: MeaningLocale,
  ptSuggestions: PtSuggestions,
): KrioluUnit[] {
  const cards = toCards(entries, locale, ptSuggestions);
  const englishOf = new Map<string, string>();
  for (const e of entries) {
    const s = e.senses.find((x) => PLAYABLE.includes(x.partOfSpeech));
    if (s) englishOf.set(e.word, shortGloss(s.glossEn));
  }
  const used = new Set<string>();
  const units: KrioluUnit[] = [];
  for (const theme of THEMES) {
    const glossSet = theme.glosses ? new Set(theme.glosses.map((g) => g.toLowerCase())) : null;
    const words = cards
      .filter((c) => !used.has(c.word))
      .filter((c) => !theme.pos || theme.pos.includes(c.pos))
      .filter((c) => !glossSet || glossSet.has((englishOf.get(c.word) ?? "").toLowerCase()))
      .map((c) => c.word);
    if (words.length < 4) continue;
    words.forEach((w) => used.add(w));
    const lessons: KrioluLesson[] = [];
    for (let i = 0; i * QUESTIONS_PER_LESSON < words.length; i++) {
      const slice = words.slice(i * QUESTIONS_PER_LESSON, (i + 1) * QUESTIONS_PER_LESSON);
      if (slice.length < 4 && lessons.length) {
        lessons[lessons.length - 1]!.words.push(...slice); // junta o resto à lição anterior
        break;
      }
      lessons.push({ id: `${theme.id}-${i + 1}`, themeId: theme.id, index: i + 1, words: slice });
    }
    units.push({ theme, lessons });
  }
  return units;
}

/** Perguntas de uma lição: só as palavras da lição; respostas erradas vêm do mesmo tema/classe. */
export function buildKrioluLessonQuiz(
  entries: SourceEntry[],
  lesson: KrioluLesson,
  unitWords: string[],
  locale: MeaningLocale,
  ptSuggestions: PtSuggestions,
  seed: number,
): PreviewQuestion[] {
  const inUnit = new Set(unitWords);
  const pool = entries.filter((e) => inUnit.has(e.word));
  const lessonSet = new Set(lesson.words);
  // Gera um quiz grande sobre o tema e fica só com as perguntas das palavras desta lição.
  return buildPreviewQuiz(pool, pool.length, seed, { locale, ptSuggestions })
    .filter((q) => lessonSet.has(q.mode === "meaning" ? q.target : q.options[q.correctIndex]!))
    .slice(0, QUESTIONS_PER_LESSON);
}
