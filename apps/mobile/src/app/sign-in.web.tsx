import { useAuth } from "@clerk/expo";
import { SignIn } from "@clerk/expo/web";
import { Redirect } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText, colors, Neto, space } from "@/design";

/**
 * Só na pré-visualização web da app: o login usa o componente web do Clerk (o fluxo do
 * telemóvel abre o browser do sistema, que não existe aqui). No Android/iOS usa-se sign-in.tsx.
 */
export default function SignInWeb() {
  const { t } = useTranslation();
  const { isSignedIn } = useAuth();
  if (isSignedIn) return <Redirect href="/learn" />;
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Neto mood="happy" size={110} />
      <AppText variant="h2" center style={{ marginTop: space.md }}>
        {t("login.title")}
      </AppText>
      <View style={{ marginTop: space.xl }}>
        <SignIn routing="hash" forceRedirectUrl="/learn" signUpForceRedirectUrl="/learn" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: space.xl,
    backgroundColor: colors.background,
  },
});
