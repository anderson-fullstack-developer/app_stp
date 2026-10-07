/** Funções de formatação do painel admin (separadas dos componentes para o fast refresh). */
import type { ContentItem } from "./types";

export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
};
export const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("pt-PT", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
};

export const contentTitle = (c: ContentItem) =>
  c.kind === "word" ? c.word : c.kind === "phrase" ? c.original : c.question;
export const contentTranslation = (c: ContentItem) =>
  c.kind === "exercise" ? (c.options[c.correctIndex] ?? "") : c.translation;
export const KIND_LABEL = { word: "Palavra", phrase: "Frase", exercise: "Exercício" } as const;
