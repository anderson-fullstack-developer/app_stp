import { router } from "expo-router";
import type { OnboardingMetadata } from "./useGoogleSignIn";

/**
 * Pré-visualização web: o login com Google faz-se no componente do Clerk (ecrã Entrar).
 * No telemóvel usa-se useGoogleSignIn.ts (browser do sistema + unsafeMetadata).
 */
export function useGoogleSignIn() {
  const signIn = async (_metadata?: OnboardingMetadata) => {
    router.push("/sign-in");
  };
  return { signIn, busy: false, error: null as string | null };
}
