/**
 * Shared HTTP client for the future NestJS API. Not used while USE_MOCK_API is true.
 * Adds the auth token (authService.getToken → Clerk JWT later) and JSON handling.
 */
import { apiUrl, type ApiResource } from "@/config/api";
import { authService } from "./auth.service";

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export async function apiRequest<T>(
  method: Method,
  resource: ApiResource,
  path: (string | number)[] = [],
  body?: unknown,
): Promise<T> {
  const token = await authService.getToken();
  const res = await fetch(apiUrl(resource, ...path), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? null : JSON.stringify(body),
  });
  const data = res.status === 204 ? undefined : await res.json().catch(() => undefined);
  if (!res.ok) throw new ApiError(res.status, `API ${method} ${resource} failed`, data);
  return data as T;
}

export const http = {
  get: <T>(r: ApiResource, ...p: (string | number)[]) => apiRequest<T>("GET", r, p),
  post: <T>(r: ApiResource, p: (string | number)[], b?: unknown) => apiRequest<T>("POST", r, p, b),
  patch: <T>(r: ApiResource, p: (string | number)[], b?: unknown) => apiRequest<T>("PATCH", r, p, b),
  del: <T>(r: ApiResource, ...p: (string | number)[]) => apiRequest<T>("DELETE", r, p),
};
