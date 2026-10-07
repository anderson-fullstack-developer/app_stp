/**
 * Quiz de PRÉ-VISUALIZAÇÃO INTERNA a partir de rascunhos importados (ex.: Kabuverdianu do Wiktionary).
 *
 * Não é conteúdo aprovado: serve só para a equipa sentir o jogo antes da revisão linguística.
 * As perguntas são montadas mecanicamente a partir da fonte. Os significados aparecem no idioma
 * de quem joga: inglês (fonte original) ou português (sugestão automática, por rever).
 */

/** A pré-visualização com rascunhos só existe em desenvolvimento (nunca numa versão publicada). */
export const PREVIEW_ENABLED = import.meta.env.DEV;

export interface SourceEntry {
  word: string;
  senses: { partOfSpeech: string; glossEn: string }[];
  variantLabels: string[];
  sourceUrl: string;
}

/** Idioma em que os significados são mostrados. */
export type MeaningLocale = "pt" | "en";

/**
 * Sugestões de tradução para português, chave "classe|significado em inglês".
 * São automáticas (DRAFT); "(confirmar)" marca as duvidosas.
 */
export type PtSuggestions = Record<string, string>;

export interface PreviewQuestion {
  id: string;
  /** "meaning": mostra a palavra e pede o significado; "word": mostra o significado e pede a palavra. */
  mode: "meaning" | "word";
  /** Texto em destaque (palavra em Kriolu ou significado). */
  target: string;
  /** Classe gramatical (chave de pos.* nas traduções da interface). */
  pos: string;
  variant: string;
  /** De onde vem o significado mostrado: sugestão automática em português ou fonte em inglês. */
  meaningSource: "pt-suggestion" | "en-source";
  options: string[];
  correctIndex: number;
  sourceUrl: string;
}

const PLAYABLE_POS = new Set(["substantivo", "verbo", "adjetivo", "advérbio", "numeral"]);

/** Primeiro significado curto e limpo ("(of a person) tall, high" → "tall"). */
export function shortGloss(gloss: string): string {
  const noParens = gloss.replace(/\([^)]*\)/g, " ");
  const first = noParens.split(/[;,]/)[0] ?? "";
  // Tira espaços a mais e pontuação solta no fim ("baobab -", "sausage.").
  return first
    .replace(/\s+/g, " ")
    .replace(/[\s.\-–]+$/, "")
    .trim();
}

interface Card {
  word: string;
  pos: string;
  gloss: string;
  variant: string;
  sourceUrl: string;
}

export function toCards(
  entries: SourceEntry[],
  locale: MeaningLocale = "en",
  ptSuggestions: PtSuggestions = {},
): Card[] {
  const cards: Card[] = [];
  const seenGloss = new Set<string>();
  for (const e of entries) {
    const sense = e.senses.find((s) => PLAYABLE_POS.has(s.partOfSpeech));
    if (!sense) continue;
    const glossEn = shortGloss(sense.glossEn);
    if (glossEn.length < 2 || glossEn.length > 28) continue;
    let gloss = glossEn;
    if (locale === "pt") {
      const pt = ptSuggestions[`${sense.partOfSpeech}|${glossEn}`];
      // Sem tradução ou duvidosa → fica fora do quiz em português.
      if (!pt || pt.includes("confirmar")) continue;
      gloss = pt;
    }
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
  opts: { locale?: MeaningLocale; ptSuggestions?: PtSuggestions } = {},
): PreviewQuestion[] {
  const rand = rng(seed);
  const locale = opts.locale ?? "en";
  const cards = toCards(entries, locale, opts.ptSuggestions);
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
    return {
      id: `q${i + 1}-${card.word}`,
      mode,
      target: mode === "meaning" ? card.word : card.gloss,
      pos: card.pos,
      variant: card.variant,
      meaningSource: locale === "pt" ? "pt-suggestion" : "en-source",
      options: all.map(label),
      correctIndex: all.indexOf(card),
      sourceUrl: card.sourceUrl,
    };
  });
}
