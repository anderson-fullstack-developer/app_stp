import type { ContentStatus, LanguageStatus } from "../generated/prisma/enums.js";

/**
 * Que estados de conteúdo podem chegar aos utilizadores, conforme o estado da língua.
 * - ACTIVE: só APPROVED (regra da especificação).
 * - BETA: também rascunhos e em revisão, sempre marcados como não revistos (ADR-14).
 * - COMING_SOON / INACTIVE: nada.
 * REJECTED e ARCHIVED nunca chegam aos utilizadores.
 */
export function visibleContentStatuses(language: LanguageStatus): ContentStatus[] {
  switch (language) {
    case "ACTIVE":
      return ["APPROVED"];
    case "BETA":
      return ["APPROVED", "UNDER_REVIEW", "DRAFT"];
    default:
      return [];
  }
}

export const isPubliclyListed = (language: LanguageStatus) =>
  language === "ACTIVE" || language === "BETA";
