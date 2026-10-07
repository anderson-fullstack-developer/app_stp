/**
 * Quiz de PRÉ-VISUALIZAÇÃO INTERNA a partir de rascunhos importados (ex.: Kabuverdianu do Wiktionary).
 *
 * Não é conteúdo aprovado: serve só para a equipa sentir o jogo antes da revisão linguística.
 * As perguntas são montadas mecanicamente a partir da fonte — nada é inventado ou traduzido.
 */

/** A pré-visualização com rascunhos só existe em desenvolvimento (nunca numa versão publicada). */
export const PREVIEW_ENABLED = import.meta.env.DEV;

export interface SourceEntry {
  word: string;
  senses: { partOfSpeech: string; glossEn: string }[];
  variantLabels: string[];
  sourceUrl: string;
}

export interface PreviewQuestion {
  id: string;
  /** "meaning": mostra a palavra e pede o significado; "word": mostra o significado e pede a palavra. */
  mode: "meaning" | "word";
  prompt: string;
  /** Texto em destaque (palavra em Kriolu ou significado em inglês). */
  target: string;
  hint: string;
  options: string[];
  correctIndex: number;
  sourceUrl: string;
}

const PLAYABLE_POS = new Set(["substantivo", "verbo", "adjetivo", "advérbio", "numeral"]);

/** Primeiro significado curto e limpo ("(of a person) tall, high" → "tall"). */
export function shortGloss(gloss: string): string {
  const noParens = gloss.replace(/\([^)]*\)/g, " ");
  const first = noParens.split(/[;,]/)[0] ?? "";
  return first.replace(/\s+/g, " ").trim();
}

interface Card {
  word: string;
  pos: string;
  gloss: string;
  variant: string;
  sourceUrl: string;
}

export function toCards(entries: SourceEntry[]): Card[] {
  const cards: Card[] = [];
  const seenGloss = new Set<string>();
  for (const e of entries) {
    const sense = e.senses.find((s) => PLAYABLE_POS.has(s.partOfSpeech));
    if (!sense) continue;
    const gloss = shortGloss(sense.glossEn);
    if (gloss.length < 2 || gloss.length > 28) continue;
    // Evita duas palavras com o mesmo significado (tornaria a pergunta ambígua).
    const key = `${sense.partOfSpeech}:${gloss.toLowerCase()}`;
    if (seenGloss.has(key)) continue;
    seenGloss.add(key);
    cards.push({
      word: e.word,
      pos: sense.partOfSpeech,
      gloss,
      variant: e.variantLabels.join(", "),
      sourceUrl: e.sourceUrl,
    });
  }
  return cards;
}

/** PRNG determinístico (mesma semente → mesmo quiz), para testes e para "jogar outra vez". */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(list: T[], rand: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function buildPreviewQuiz(
  entries: SourceEntry[],
  count = 10,
  seed = Date.now(),
): PreviewQuestion[] {
  const rand = rng(seed);
  const cards = toCards(entries);
  const picked = shuffle(cards, rand).slice(0, count);

  return picked.map((card, i) => {
    const mode: PreviewQuestion["mode"] = i % 2 === 0 ? "meaning" : "word";
    const pool = cards.filter(
      (c) => c.pos === card.pos && c.word !== card.word && c.gloss !== card.gloss,
    );
    const distractors = shuffle(
      pool.length >= 3 ? pool : cards.filter((c) => c.word !== card.word),
      rand,
    ).slice(0, 3);
    const all = shuffle([card, ...distractors], rand);
    const label = (c: Card) => (mode === "meaning" ? c.gloss : c.word);
    const variant = card.variant ? ` · variante ${card.variant}` : "";
    return {
      id: `q${i + 1}-${card.word}`,
      mode,
      prompt: mode === "meaning" ? "O que significa" : "Como se diz em Kriolu",
      target: mode === "meaning" ? card.word : card.gloss,
      hint:
        mode === "meaning"
          ? `${card.pos}${variant} · significado em inglês (ainda por traduzir)`
          : `${card.pos} · significado em inglês (ainda por traduzir)`,
      options: all.map(label),
      correctIndex: all.indexOf(card),
      sourceUrl: card.sourceUrl,
    };
  });
}
