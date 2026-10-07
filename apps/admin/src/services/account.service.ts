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
  /** Calculado pelo servidor (docs/REGRAS_DE_NEGOCIO.md) — o cliente só mostra. */
  progress: {
    xpTotal: number;
    level: { level: number; levelStartXp: number; nextLevelXp: number; progress: number };
    coins: number;
    streak: { current: number; longest: number; freezes: number; activeToday: boolean };
    correctAnswers: number;
    lessonsCompleted: number;
    today: string;
    week: boolean[];
    todayIndex: number;
  };
}

export const accountService = {
  getProfile: () => http.get<AccountProfile>("me"),
};
