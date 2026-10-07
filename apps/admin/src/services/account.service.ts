/**
 * accountService — perfil do utilizador guardado na nossa API (Neon), não no Clerk.
 * O Clerk trata do login; a API é a fonte do perfil da app, papéis e (mais tarde) progresso.
 */
import { http } from "./http";

export type AccountRole =
  "USER" | "MODERATOR" | "CONTENT_EDITOR" | "LINGUIST" | "ADMIN" | "SUPER_ADMIN";

/** Resposta de GET /api/v1/me (apps/api/src/users/users.service.ts → profile). */
export interface AccountProfile {
  id: string;
  email: string;
  username: string;
  name: string;
  avatarColor: string | null;
  countryCode: string | null;
  spokenLanguages: string[];
  uiLocale: string;
  timezone: string;
  learningLanguageId: string | null;
  status: "ACTIVE" | "SUSPENDED" | "BANNED" | "DELETED";
  roles: { role: AccountRole; languageId: string | null }[];
  createdAt: string;
}

export const accountService = {
  getProfile: () => http.get<AccountProfile>("me"),
};
