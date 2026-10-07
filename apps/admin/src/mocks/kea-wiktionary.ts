/**
 * Rascunhos de vocabulário em Kabuverdianu importados do Wiktionary (CC BY-SA 4.0).
 *
 * São material de PARTIDA para os linguistas: entram sempre como DRAFT, sem tradução em
 * português (o significado em inglês fica nas notas) e só chegam à app depois de revistos
 * e aprovados por um falante nativo. Origem e licença em content/sources/wiktionary-kea/.
 */
import data from "@content/sources/wiktionary-kea/entries.json";
import type { VocabItem } from "@/admin/types";

interface Entry {
  word: string;
  senses: { partOfSpeech: string; glossEn: string }[];
  variantLabels: string[];
  sourceUrl: string;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function keaWiktionaryDrafts(importedAt: string): VocabItem[] {
  return (data.entries as Entry[]).map((e, i) => {
    const meanings = e.senses.filter((s) => s.glossEn.length > 1);
    const notes = meanings.length
      ? `Significado (EN, Wiktionary): ${meanings.map((s) => `${s.partOfSpeech} — ${s.glossEn}`).join("; ")}`
      : "⚠ Significado em falta na fonte — confirmar com falante nativo.";
    return {
      id: `kea-wkt-${i + 1}`,
      kind: "word",
      languageId: "kabuverdianu",
      word: e.word,
      translation: "",
      category: cap(e.senses[0]?.partOfSpeech ?? "outro"),
      difficulty: "Média",
      variant: e.variantLabels.length ? e.variantLabels.join(", ") : "Não indicada",
      notes,
      source: `Wiktionary (CC BY-SA 4.0) — ${e.sourceUrl}`,
      audioId: null,
      speaker: "",
      status: "DRAFT",
      author: "Importação Wiktionary",
      reviewer: null,
      updatedAt: importedAt,
      history: [],
    };
  });
}

export const KEA_WIKTIONARY_COUNT = (data.entries as Entry[]).length;
