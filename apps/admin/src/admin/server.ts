/**
 * Painel ligado ao servidor (apps/api, /admin e /content). Com sessão Clerk e API
 * configurada, o papel vem dos papéis da conta (GET /me); o servidor volta a verificar
 * tudo em cada pedido — a interface só esconde o que a pessoa não pode usar.
 */
import { useQuery } from "@tanstack/react-query";
import type { CountryWithLanguages } from "@stp/types/api";
import { useAccountProfile } from "@/hooks/use-account";
import { useServerLessonsEnabled } from "@/hooks/use-server-lessons";
import { http } from "@/services/http";
import type { AdminRole, AdminSession } from "./types";

export type ServerContentKind = "vocabulary" | "phrase";
export type ServerContentStatus = "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "ARCHIVED";
export type ReviewAction = "submit" | "approve" | "request_changes" | "reject" | "archive";

interface Person {
  id: string;
  username: string;
  name: string;
}

export interface ServerContentRow {
  id: string;
  kind: ServerContentKind;
  languageId: string;
  text: string;
  translations: { pt?: string; en?: string };
  partOfSpeech: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  category: string | null;
  notes: string | null;
  sourceRef: string | null;
  status: ServerContentStatus;
  version: number;
  aiGenerated: boolean;
  author: Person;
  reviewer: Person | null;
  approvedAt: string | null;
  updatedAt: string;
}

export interface ContentInput {
  languageId: string;
  text: string;
  translations: { pt?: string; en?: string };
  partOfSpeech?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  category?: string;
  notes?: string;
  context?: string;
  sourceRef?: string;
}

export interface ReviewHistoryRow {
  action: string;
  comment: string | null;
  createdAt: string;
  actor: { id: string; username: string };
}

export interface AdminOverview {
  content: Record<
    "vocabulary" | "phrase" | "exercise",
    Partial<Record<ServerContentStatus, number>>
  >;
  users: { active: number; newThisWeek: number; activeThisWeek: number };
}

export interface AdminUserRow {
  id: string;
  username: string;
  name: string;
  email: string;
  status: "ACTIVE" | "SUSPENDED" | "BANNED" | "DELETED";
  countryCode: string | null;
  createdAt: string;
  roles: { id: string; role: AdminRole; languageId: string | null }[];
  xpTotal: number;
  level: number;
  streak: number;
}

const kindPath = (k: ServerContentKind) => ["content", k];

export const adminApi = {
  overview: () => http.get<AdminOverview>("admin", "overview"),
  list: (
    kind: ServerContentKind,
    f: { languageId?: string; status?: ServerContentStatus; q?: string },
  ) =>
    http.getQ<ServerContentRow[]>(
      "admin",
      kindPath(kind),
      Object.fromEntries(Object.entries(f).filter(([, v]) => v)) as Record<string, string>,
    ),
  create: (kind: ServerContentKind, body: ContentInput) =>
    http.post<{ id: string }>("admin", kindPath(kind), body),
  update: (kind: ServerContentKind, id: string, body: ContentInput) =>
    http.patch<{ id: string }>("admin", [...kindPath(kind), id], body),
  review: (kind: ServerContentKind, id: string, action: ReviewAction, comment?: string) =>
    http.post("content", [kind, id, action], comment ? { comment } : {}),
  history: (kind: ServerContentKind, id: string) =>
    http.get<ReviewHistoryRow[]>("content", kind, id, "reviews"),
  users: (q: string) => http.getQ<AdminUserRow[]>("admin", ["users"], q ? { q } : {}),
  grant: (userId: string, role: AdminRole, languageId: string | null) =>
    http.post("admin", ["users", userId, "roles"], { role, languageId }),
  revoke: (roleId: string) => http.del("admin", "roles", roleId),
  setStatus: (userId: string, status: "ACTIVE" | "SUSPENDED") =>
    http.post("admin", ["users", userId, "status"], { status }),
  languages: () => http.get<CountryWithLanguages[]>("languages"),
};

const ROLE_ORDER: AdminRole[] = ["SUPER_ADMIN", "ADMIN", "LINGUIST", "CONTENT_EDITOR", "MODERATOR"];

/** Sessão do painel a partir dos papéis da conta (o papel mais alto decide o menu). */
export function useServerAdmin(): {
  enabled: boolean;
  loading: boolean;
  session: AdminSession | null;
  roles: { role: string; languageId: string | null }[];
} {
  const enabled = useServerLessonsEnabled();
  const account = useAccountProfile();
  const me = account.data;
  if (!enabled) return { enabled, loading: false, session: null, roles: [] };
  if (!me) return { enabled, loading: account.isPending, session: null, roles: [] };
  const role = ROLE_ORDER.find((r) => me.roles.some((x) => x.role === r));
  return {
    enabled,
    loading: false,
    roles: me.roles,
    session: role
      ? {
          id: me.id,
          name: me.name,
          email: me.email,
          role,
          expiresAt: Number.MAX_SAFE_INTEGER,
        }
      : null,
  };
}

/** Línguas (para filtros e formulários), em lista simples. */
export function useLanguageOptions() {
  const q = useQuery({
    queryKey: ["admin", "languages"],
    queryFn: adminApi.languages,
    staleTime: 600_000,
  });
  return (q.data ?? []).flatMap((c) =>
    c.languages.map((l) => ({ value: l.id, label: `${l.name} (${c.name})` })),
  );
}

/** Rotas do painel já ligadas ao servidor (as outras mostram aviso de demonstração). */
export const SERVER_ADMIN_ROUTES = [
  "/admin",
  "/admin/review",
  "/admin/vocabulary",
  "/admin/phrases",
  "/admin/users",
];
