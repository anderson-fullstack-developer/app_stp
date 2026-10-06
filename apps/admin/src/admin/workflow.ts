/** Content review workflow rules (pure). Only APPROVED content may reach the app. */
import { can } from "./permissions";
import type { AdminRole, ContentItem, ContentStatus, ExerciseItem, ReviewEntry } from "./types";

export type ReviewAction = "SUBMIT" | "APPROVE" | "REQUEST_CHANGES" | "REJECT" | "ARCHIVE";

export function canPerform(role: AdminRole, action: ReviewAction, status: ContentStatus): boolean {
  switch (action) {
    case "SUBMIT": return can(role, "content.edit") && (status === "DRAFT" || status === "REJECTED");
    case "APPROVE":
    case "REQUEST_CHANGES":
    case "REJECT": return can(role, "content.publish") && status === "UNDER_REVIEW";
    case "ARCHIVE": return can(role, "content.publish") && status !== "ARCHIVED";
  }
}

const NEXT: Record<ReviewAction, ContentStatus> = {
  SUBMIT: "UNDER_REVIEW", APPROVE: "APPROVED", REQUEST_CHANGES: "DRAFT", REJECT: "REJECTED", ARCHIVE: "ARCHIVED",
};
const LOG: Record<ReviewAction, ReviewEntry["action"] | null> = {
  SUBMIT: "SUBMITTED", APPROVE: "APPROVED", REQUEST_CHANGES: "CHANGES_REQUESTED", REJECT: "REJECTED", ARCHIVE: null,
};

export function applyReview<T extends ContentItem>(item: T, action: ReviewAction, by: { name: string; role: AdminRole }, comment?: string, at = new Date().toISOString()): T {
  if (!canPerform(by.role, action, item.status)) throw new Error(`Ação ${action} não permitida para ${by.role} em ${item.status}`);
  const log = LOG[action];
  const reviewer = action === "APPROVE" || action === "REJECT" || action === "REQUEST_CHANGES" ? by.name : item.reviewer;
  return {
    ...item, status: NEXT[action], reviewer, updatedAt: at,
    history: log ? [...item.history, { by: by.name, role: by.role, at, action: log, comment }] : item.history,
  };
}

export const isLiveInApp = (item: { status: ContentStatus }) => item.status === "APPROVED";

/** Mock AI: builds DRAFT quiz suggestions from APPROVED content. Never publishes. */
export function suggestQuizzes(source: ContentItem[], author = "IA (sugestão)"): ExerciseItem[] {
  return source.filter(isLiveInApp).slice(0, 3).map((s, i) => {
    const prompt = s.kind === "word" ? s.word : s.kind === "phrase" ? s.original : s.question;
    const answer = s.kind === "exercise" ? (s.options[s.correctIndex] ?? "Tradução A") : s.translation;
    return {
      id: `ai-${s.id}-${i}`, kind: "exercise", languageId: s.languageId, type: "MULTIPLE_CHOICE",
      question: `O que significa "${prompt}"?`, options: [answer, "Sugestão incorreta 1", "Sugestão incorreta 2", "Sugestão incorreta 3"], correctIndex: 0,
      lessonId: null, usage: ["learning"], category: s.category, difficulty: s.difficulty, variant: s.variant, notes: "Gerado por IA a partir de conteúdo aprovado.",
      source: `Baseado em ${s.id}`, audioId: null, status: "DRAFT", author, reviewer: null, updatedAt: new Date().toISOString(), history: [], aiGenerated: true,
    };
  });
}
