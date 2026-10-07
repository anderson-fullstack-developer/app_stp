/**
 * authService — conceptual authentication API, prepared for Clerk.
 *
 * NOW: mock-backed (no real auth). LATER: swap each function body for the
 * Clerk equivalent — keep signatures so screens don't change:
 *   signIn()        → clerk.signIn / <SignIn />
 *   signUp()        → clerk.signUp / <SignUp />
 *   signOut()       → clerk.signOut()
 *   getCurrentUser()→ clerk.user (map to our User type)
 *   getToken()      → clerk.session.getToken() (JWT for the NestJS API)
 *
 * Never read auth state from localStorage in components — always go through
 * this service so the Clerk swap is a one-file change.
 */
import * as mock from "@/mocks";
import type { User } from "@/types";

const delay = <T>(value: T, ms = 250) => new Promise<T>((r) => setTimeout(() => r(value), ms));

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput {
  name: string;
  username: string;
  email: string;
  password: string;
  /** País onde vive (id de COUNTRY_IDS em @stp/i18n). */
  country: string;
  /** Línguas que fala (ids de SPOKEN_LANGUAGE_IDS) — define a língua das traduções. */
  spokenLanguages: string[];
}

export interface AuthSession {
  user: User;
  /** Placeholder token — will be the Clerk session JWT sent to the API. */
  token: string;
}

const MOCK_TOKEN = "mock-token";

export const authService = {
  /** Sign in with email + password. Future: Clerk signIn. */
  signIn: (input: SignInInput): Promise<AuthSession> =>
    delay({ user: { ...mock.currentUser, email: input.email }, token: MOCK_TOKEN }),

  /** Create a new account. Future: Clerk signUp (+ email verification). */
  signUp: (input: SignUpInput): Promise<AuthSession> =>
    delay({
      user: {
        ...mock.currentUser,
        name: input.name,
        username: input.username,
        email: input.email,
        country: input.country,
        spokenLanguages: input.spokenLanguages,
      },
      token: MOCK_TOKEN,
    }),

  /** Sign in with Google. Future: Clerk OAuth (sso callback). */
  signInWithGoogle: (): Promise<AuthSession> =>
    delay({ user: mock.currentUser, token: MOCK_TOKEN }),

  /** End the session. Future: clerk.signOut(). */
  signOut: (): Promise<true> => delay(true),

  /** Current signed-in user, or null when signed out. Future: clerk.user mapped to User. */
  getCurrentUser: (): Promise<User | null> => delay(mock.currentUser),

  /** Session token for API calls (Authorization: Bearer). Future: clerk.session.getToken(). */
  getToken: (): Promise<string | null> => delay(MOCK_TOKEN),
};
