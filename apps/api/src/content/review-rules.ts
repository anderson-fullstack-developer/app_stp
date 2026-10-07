/**
 * Fluxo de revisão de conteúdo (especificação §27; AGENTS.md: "quem cria não aprova").
 *   DRAFT/REJECTED --submit--> UNDER_REVIEW --approve--> APPROVED --archive--> ARCHIVED
 *                              UNDER_REVIEW --request_changes--> DRAFT
 *                              UNDER_REVIEW --reject--> REJECTED
 * Funções puras: o serviço só aplica o que estas regras permitem.
 */
import type { ContentStatus, ReviewAction, Role } from "../generated/prisma/enums.js";

export const REVIEW_ACTIONS = [
  "submit",
  "approve",
  "request_changes",
  "reject",
  "archive",
] as const;
export type ReviewActionName = (typeof REVIEW_ACTIONS)[number];

const FLOW: Record<
  ReviewActionName,
  { from: ContentStatus[]; to: ContentStatus; log: ReviewAction }
> = {
  submit: { from: ["DRAFT", "REJECTED"], to: "UNDER_REVIEW", log: "SUBMITTED" },
  approve: { from: ["UNDER_REVIEW"], to: "APPROVED", log: "APPROVED" },
  request_changes: { from: ["UNDER_REVIEW"], to: "DRAFT", log: "CHANGES_REQUESTED" },
  reject: { from: ["UNDER_REVIEW"], to: "REJECTED", log: "REJECTED" },
  archive: { from: ["APPROVED"], to: "ARCHIVED", log: "ARCHIVED" },
};

export interface Actor {
  id: string;
  roles: { role: Role; languageId: string | null }[];
}

export interface ReviewTarget {
  status: ContentStatus;
  createdById: string;
  languageId: string;
}

export type ReviewDecision =
  | { ok: true; to: ContentStatus; log: ReviewAction }
  | {
      ok: false;
      code: "INVALID_TRANSITION" | "AUTHOR_CANNOT_REVIEW" | "FORBIDDEN_ROLE";
      message: string;
    };

/** O ator tem este papel para esta língua (papel global ou da língua; SUPER_ADMIN vale como ADMIN). */
export function hasRole(actor: Actor, role: Role, languageId: string): boolean {
  return actor.roles.some(
    (r) =>
      (r.role === role || (role === "ADMIN" && r.role === "SUPER_ADMIN")) &&
      (r.languageId === null || r.languageId === languageId),
  );
}

export function decideReview(
  action: ReviewActionName,
  target: ReviewTarget,
  actor: Actor,
): ReviewDecision {
  const step = FLOW[action];
  if (!step.from.includes(target.status)) {
    return {
      ok: false,
      code: "INVALID_TRANSITION",
      message: `Não é possível "${action}" conteúdo em ${target.status}.`,
    };
  }
  const lang = target.languageId;
  const isAuthor = actor.id === target.createdById;
  const isAdmin = hasRole(actor, "ADMIN", lang);
  const isLinguist = hasRole(actor, "LINGUIST", lang);
  const isEditor = hasRole(actor, "CONTENT_EDITOR", lang);

  switch (action) {
    case "submit":
      if (isAuthor || isEditor || isLinguist || isAdmin) break;
      return { ok: false, code: "FORBIDDEN_ROLE", message: "Sem permissão para submeter." };
    case "approve":
    case "request_changes":
    case "reject":
      // Regra absoluta: quem criou nunca revê o próprio conteúdo — nem sendo administrador.
      if (isAuthor) {
        return {
          ok: false,
          code: "AUTHOR_CANNOT_REVIEW",
          message: "Quem criou o conteúdo não o pode rever.",
        };
      }
      if (isLinguist || isAdmin) break;
      return {
        ok: false,
        code: "FORBIDDEN_ROLE",
        message: "Só linguistas desta língua ou administradores podem rever.",
      };
    case "archive":
      if (isAdmin) break;
      return { ok: false, code: "FORBIDDEN_ROLE", message: "Só administradores podem arquivar." };
  }
  return { ok: true, to: step.to, log: step.log };
}
