/**
 * API configuration — the ONLY place backend URLs are defined.
 * Components must never contain URLs; services build them from here.
 * Values come from public VITE_* env vars (see .env.example). Empty = mock mode.
 */
const env = import.meta.env as Record<string, string | undefined>;

/** Base URL of the future NestJS API, e.g. https://api.linguastp.st */
export const API_BASE_URL = (env["VITE_API_URL"] ?? "").replace(/\/+$/, "");
/** Socket.IO server for multiplayer. */
export const SOCKET_URL = env["VITE_SOCKET_URL"] ?? "";
export const API_VERSION = "v1";
export const API_PREFIX = `/api/${API_VERSION}`;
/** While no API URL is configured, services keep using mock data. */
export const USE_MOCK_API = API_BASE_URL === "";

/** Resource roots. Paths are relative to API_BASE_URL. */
export const API_ENDPOINTS = {
  auth: `${API_PREFIX}/auth`,
  me: `${API_PREFIX}/me`,
  users: `${API_PREFIX}/users`,
  languages: `${API_PREFIX}/languages`,
  lessons: `${API_PREFIX}/lessons`,
  progress: `${API_PREFIX}/progress`,
  friends: `${API_PREFIX}/friends`,
  leaderboards: `${API_PREFIX}/leaderboards`,
  games: `${API_PREFIX}/games`,
  rooms: `${API_PREFIX}/rooms`,
  admin: `${API_PREFIX}/admin`,
} as const;

export type ApiResource = keyof typeof API_ENDPOINTS;

/** Build a full URL: apiUrl("lessons", id) → `${API_BASE_URL}/api/v1/lessons/<id>` */
export function apiUrl(resource: ApiResource, ...segments: (string | number)[]): string {
  const tail = segments.map((s) => encodeURIComponent(String(s))).join("/");
  return `${API_BASE_URL}${API_ENDPOINTS[resource]}${tail ? `/${tail}` : ""}`;
}
