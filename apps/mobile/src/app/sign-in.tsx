import { useAuth, useSSO } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import { Redirect, router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppButton, AppText, Card, colors, haptics, Neto, space } from "@/design";

// Fecha o browser do login quando o Google devolve o controlo à app.
WebBrowser.maybeCompleteAuthSession();

/**
 * Entrar ou criar conta com Google, pelo browser do telemóvel (funciona no Expo Go).
 * A conta é a mesma da app web: o progresso fica no servidor.
 */
export default function SignIn() {
  const { t } = useTranslation();
  const { isSignedIn } = useAuth();
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

  if (isSignedIn) return <Redirect href="/learn" />;

  const google = async () => {
    setBusy(true);
    setError(null);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri({ path: "sign-in" }),
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

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.top}>
        <Neto mood="happy" size={132} />
        <AppText variant="h1" center style={{ marginTop: space.lg }}>
          {t("login.title")}
        </AppText>
        <AppText tone="muted" center>
          {t("login.subtitle")}
        </AppText>
      </View>
      <Card style={styles.card}>
        <AppButton variant="secondary" loading={busy} onPress={() => void google()}>
          {t("register.google")}
        </AppButton>
        {error ? (
          <AppText variant="small" tone="danger" center style={{ marginTop: space.md }}>
            {error}
          </AppText>
        ) : null}
      </Card>
      <AppButton variant="ghost" size="md" onPress={() => router.back()}>
        {t("common.back")}
      </AppButton>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: space.xxl,
    justifyContent: "center",
    gap: space.xl,
  },
  top: { alignItems: "center", gap: space.xs },
  card: { padding: space.xl },
});
