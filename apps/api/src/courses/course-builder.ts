/**
 * Monta a estrutura de um curso por temas (unidades → lições → palavras) a partir do
 * vocabulário da base de dados. Função pura e determinística: o seed usa-a para gravar
 * o curso de Kriolu (Beta, ADR-14). Organiza conteúdo existente — não cria palavras.
 * Regras iguais às do protótipo (apps/admin/src/lib/kriolu-course.ts).
 */
import type { PartOfSpeech } from "../generated/prisma/client.js";

/** Classes gramaticais dos temas (em português, como em content/courses/…/themes.json). */
const POS_FROM_PT: Record<string, PartOfSpeech> = {
  substantivo: "NOUN",
  verbo: "VERB",
  adjetivo: "ADJECTIVE",
  advérbio: "ADVERB",
  numeral: "NUMERAL",
};
export const PLAYABLE_POS = new Set<PartOfSpeech>(Object.values(POS_FROM_PT));

export interface ThemeDef {
  id: string;
  icon: string;
  pos?: string[];
  glosses?: string[];
}

export interface VocabItem {
  id: string;
  word: string;
  partOfSpeech: PartOfSpeech;
  /** Significado em inglês (fonte original). */
  glossEn: string;
}

export interface BuiltLesson {
  slug: string;
  index: number;
  vocabularyIds: string[];
}
export interface BuiltUnit {
  slug: string;
  icon: string;
  order: number;
  lessons: BuiltLesson[];
}

/** Primeiro significado curto e limpo ("(of a person) tall, high" → "tall"). */
export function shortGloss(gloss: string): string {
  return (gloss.replace(/\([^)]*\)/g, " ").split(/[;,]/)[0] ?? "")
    .replace(/\s+/g, " ")
    .replace(/[\s.\-–]+$/, "")
    .trim();
}

/** Palavras que dão boas perguntas: classe jogável, significado curto, sem significados repetidos. */
export function playableItems(items: VocabItem[]): VocabItem[] {
  const seen = new Set<string>();
  const out: VocabItem[] = [];
  for (const it of [...items].sort((a, b) => a.word.localeCompare(b.word, "pt"))) {
    if (!PLAYABLE_POS.has(it.partOfSpeech)) continue;
    const gloss = shortGloss(it.glossEn);
    if (gloss.length < 2 || gloss.length > 28) continue;
    const key = `${it.partOfSpeech}:${gloss.toLowerCase()}`;
    if (seen.has(key)) continue; // significado repetido tornaria a pergunta ambígua
    seen.add(key);
    out.push({ ...it, glossEn: gloss });
  }
  return out;
}

export function buildThemedCourse(
  items: VocabItem[],
  themes: ThemeDef[],
  wordsPerLesson: number,
): BuiltUnit[] {
  const pool = playableItems(items);
  const used = new Set<string>();
  const units: BuiltUnit[] = [];
  for (const theme of themes) {
    const posSet = theme.pos ? new Set(theme.pos.map((p) => POS_FROM_PT[p])) : null;
    const glossSet = theme.glosses ? new Set(theme.glosses.map((g) => g.toLowerCase())) : null;
    const chosen = pool.filter(
      (it) =>
        !used.has(it.id) &&
        (!posSet || posSet.has(it.partOfSpeech)) &&
        (!glossSet || glossSet.has(it.glossEn.toLowerCase())),
    );
    if (chosen.length < 4) continue; // tema sem palavras suficientes para perguntas
    chosen.forEach((it) => used.add(it.id));
    const lessons: BuiltLesson[] = [];
    for (let i = 0; i * wordsPerLesson < chosen.length; i++) {
      const ids = chosen.slice(i * wordsPerLesson, (i + 1) * wordsPerLesson).map((it) => it.id);
      const last = lessons[lessons.length - 1];
      if (ids.length < 4 && last) {
        last.vocabularyIds.push(...ids); // o resto junta-se à lição anterior
        break;
      }
      lessons.push({ slug: `${theme.id}-${i + 1}`, index: i + 1, vocabularyIds: ids });
    }
    units.push({ slug: theme.id, icon: theme.icon, order: units.length, lessons });
  }
  return units;
}
