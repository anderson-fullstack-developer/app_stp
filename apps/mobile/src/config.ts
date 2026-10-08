/**
 * Configuração pública da app (variáveis EXPO_PUBLIC_*, ver .env.example). Nunca segredos:
 * tudo o que está aqui vai dentro da app instalada.
 */
export const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
/** Raiz da API NestJS (sem /api/v1). */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
export const API_PREFIX = "/api/v1";
/** Língua por omissão enquanto o perfil não diz outra (a única com curso, por agora). */
export const DEFAULT_LEARNING_LANGUAGE = "kabuverdianu";
