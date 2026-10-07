/** Role → permission matrix. The future NestJS API (Clerk claims) must enforce the same rules server-side. */
import type { AdminRole } from "./types";

export type Permission =
  | "dashboard"
  | "content.edit"
  | "content.review"
  | "content.publish"
  | "languages.manage"
  | "users.view"
  | "users.moderate"
  | "multiplayer.view"
  | "reports.manage"
  | "rewards.manage"
  | "premium.manage"
  | "ads.manage"
  | "analytics.view"
  | "audit.view"
  | "settings.manage";

const ALL: Permission[] = [
  "dashboard",
  "content.edit",
  "content.review",
  "content.publish",
  "languages.manage",
  "users.view",
  "users.moderate",
  "multiplayer.view",
  "reports.manage",
  "rewards.manage",
  "premium.manage",
  "ads.manage",
  "analytics.view",
  "audit.view",
  "settings.manage",
];

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  SUPER_ADMIN: ALL,
  ADMIN: ALL.filter((p) => p !== "settings.manage"),
  LINGUIST: ["dashboard", "content.edit", "content.review", "content.publish"],
  CONTENT_EDITOR: ["dashboard", "content.edit"],
  MODERATOR: ["dashboard", "users.view", "users.moderate", "multiplayer.view", "reports.manage"],
};

export const can = (role: AdminRole | undefined, p: Permission) =>
  !!role && ROLE_PERMISSIONS[role].includes(p);

export const ROLE_LABEL: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  LINGUIST: "Linguista",
  CONTENT_EDITOR: "Editor de conteúdo",
  MODERATOR: "Moderador",
};
