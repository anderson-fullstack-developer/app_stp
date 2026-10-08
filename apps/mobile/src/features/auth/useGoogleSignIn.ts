import { useSSO } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { haptics } from "@/design";

// Fecha o browser do login quando o Google devolve o controlo à app.
WebBrowser.maybeCompleteAuthSession();

/** Escolhas do onboarding que seguem com o registo (o servidor grava-as no perfil). */
export interface OnboardingMetadata {
  countryCode?: string;
  spokenLanguages?: string[];
  uiLocale?: string;
  learningLanguageId?: string;
  reasons?: string[];
  dailyGoalMinutes?: number | null;
}

/**
 * Entrar/criar conta com Google pelo browser do telemóvel (funciona no Expo Go).
 * No registo, `metadata` vai em unsafeMetadata (só é usada quando a conta é nova).
 */
export function useGoogleSignIn() {
  const { t } = useTranslation();
  const { startSSOFlow } = useSSO();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Abre o browser mais depressa no Android.
  useEffect(() => {
    void WebBrowser.warmUpAsync().catch(() => {});
    return () => {
      void WebBrowser.coolDownAsync().catch(() => {});
    };
  }, []);

  const signIn = async (metadata?: OnboardingMetadata) => {
    setBusy(true);
    setError(null);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri({ path: "sign-in" }),
        ...(metadata ? { unsafeMetadata: { ...metadata } } : {}),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        haptics.success();
        router.replace("/learn");
      }
    } catch {
      setError(t("login.googleError"));
      haptics.error();
    } finally {
      setBusy(false);
    }
  };

  return { signIn, busy, error };
}
