import { z } from "zod";

/**
 * Converte os dados de um utilizador do Clerk (webhook ou API) no nosso perfil.
 * Funções puras — sem base de dados — para serem testadas isoladamente.
 */

/** Forma mínima, comum ao webhook (snake_case) e à API do Clerk (camelCase). */
export interface ClerkUserInput {
  clerkId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  unsafeMetadata: unknown;
}

/** O que o onboarding da app envia em unsafeMetadata (validado: é dado vindo do cliente). */
const OnboardingMetadata = z
  .object({
    countryCode: z
      .string()
      .regex(/^[a-z]{2,5}$/)
      .optional()
      .catch(undefined),
    spokenLanguages: z
      .array(z.string().regex(/^[a-z]{2,10}$/))
      .max(12)
      .optional()
      .catch(undefined),
    uiLocale: z.enum(["pt", "en", "fr"]).optional().catch(undefined),
    learningLanguageId: z
      .string()
      .regex(/^[a-z][a-z0-9_-]{1,40}$/)
      .optional()
      .catch(undefined),
  })
  .catch({});

export type OnboardingProfile = z.infer<typeof OnboardingMetadata>;

export function parseOnboarding(metadata: unknown): OnboardingProfile {
  return OnboardingMetadata.parse(metadata ?? {});
}

export function displayName(u: Pick<ClerkUserInput, "firstName" | "lastName" | "email">): string {
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  if (full) return full.slice(0, 80);
  return u.email?.split("@")[0]?.slice(0, 80) ?? "Utilizador";
}

/** Base de username: o do Clerk ou a parte local do email, só com [a-z0-9_.], 3–20 caracteres. */
export function usernameBase(u: Pick<ClerkUserInput, "username" | "email">): string {
  const raw = (u.username ?? u.email?.split("@")[0] ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, "")
    .replace(/^[._]+|[._]+$/g, "")
    .slice(0, 20);
  return raw.length >= 3 ? raw : `user${raw}`.padEnd(4, "0");
}

/** Normaliza o objeto de utilizador do webhook (UserJSON, snake_case). */
export function fromWebhook(data: {
  id: string;
  email_addresses?: { id: string; email_address: string }[];
  primary_email_address_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  unsafe_metadata?: unknown;
}): ClerkUserInput {
  const emails = data.email_addresses ?? [];
  const primary = emails.find((e) => e.id === data.primary_email_address_id) ?? emails[0];
  return {
    clerkId: data.id,
    email: primary?.email_address?.toLowerCase() ?? null,
    firstName: data.first_name ?? null,
    lastName: data.last_name ?? null,
    username: data.username ?? null,
    unsafeMetadata: data.unsafe_metadata,
  };
}

/** Normaliza o utilizador devolvido pela API do Clerk (camelCase). */
export function fromApi(u: {
  id: string;
  emailAddresses: { id: string; emailAddress: string }[];
  primaryEmailAddressId: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  unsafeMetadata: unknown;
}): ClerkUserInput {
  const primary =
    u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId) ?? u.emailAddresses[0];
  return {
    clerkId: u.id,
    email: primary?.emailAddress?.toLowerCase() ?? null,
    firstName: u.firstName,
    lastName: u.lastName,
    username: u.username,
    unsafeMetadata: u.unsafeMetadata,
  };
}
