import { useAuth } from "@clerk/expo";
import { Redirect, router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppButton, AppText, Card, colors, Neto, space } from "@/design";
import { useGoogleSignIn } from "@/features/auth/useGoogleSignIn";

/** Entrar com Google (a conta é a mesma da app web: o progresso fica no servidor). */
export default function SignIn() {
  const { t } = useTranslation();
  const { isSignedIn } = useAuth();
  const google = useGoogleSignIn();
  if (isSignedIn) return <Redirect href="/learn" />;

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
        <AppButton variant="secondary" loading={google.busy} onPress={() => void google.signIn()}>
          {t("register.google")}
        </AppButton>
        {google.error ? (
          <AppText variant="small" tone="danger" center style={{ marginTop: space.md }}>
            {google.error}
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
