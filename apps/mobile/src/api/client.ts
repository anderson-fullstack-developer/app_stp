import { useAuth } from "@clerk/expo";
import { useMemo } from "react";
import { API_PREFIX, API_URL } from "@/config";

/** Erro da API com o código estável do servidor (ex.: LESSON_LOCKED). */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

type Query = Record<string, string | undefined>;

async function request<T>(
  getToken: () => Promise<string | null>,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  query?: Query,
): Promise<T> {
  const token = await getToken();
  const qs = query
    ? "?" +
      new URLSearchParams(
        Object.entries(query).filter((e): e is [string, string] => e[1] !== undefined),
      ).toString()
    : "";
  const res = await fetch(`${API_URL}${API_PREFIX}${path}${qs}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? null : JSON.stringify(body),
  });
  const data = (res.status === 204 ? undefined : await res.json().catch(() => undefined)) as
    (T & { code?: string; message?: string }) | undefined;
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.code ?? "HTTP_ERROR",
      data?.message ?? `HTTP ${res.status}`,
    );
  }
  return data as T;
}

/** Cliente da API com o token de sessão do Clerk em cada pedido. */
export function useApi() {
  const { getToken } = useAuth();
  return useMemo(
    () => ({
      get: <T>(path: string, query?: Query) => request<T>(getToken, "GET", path, undefined, query),
      post: <T>(path: string, body?: unknown) => request<T>(getToken, "POST", path, body ?? {}),
      patch: <T>(path: string, body: unknown) => request<T>(getToken, "PATCH", path, body),
      del: (path: string) => request<void>(getToken, "DELETE", path),
    }),
    [getToken],
  );
}
