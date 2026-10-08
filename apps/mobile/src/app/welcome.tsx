import { useAuth } from "@clerk/expo";
import { Image } from "expo-image";
import { Redirect, router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppButton, AppText, colors, Neto, radius, shadows, space } from "@/design";

/** Boas-vindas (igual ao 1.º ecrã do onboarding da web): ilha, Neto a apresentar-se, começar. */
export default function Welcome() {
  const { t } = useTranslation();
  const { isSignedIn } = useAuth();
  if (isSignedIn) return <Redirect href="/learn" />;

  return (
    <View style={styles.page}>
      <View style={styles.hero}>
        <Image
          source={require("../../assets/images/island.jpg")}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessibilityLabel={t("onboarding.welcomeImageAlt")}
        />
        <View style={styles.netoRow}>
          <View style={[styles.bubble, shadows.raised]}>
            <AppText variant="small" style={{ fontFamily: "Figtree_600SemiBold" }}>
              {t("onboarding.netoHello")}
            </AppText>
          </View>
          <Neto mood="happy" size={124} />
        </View>
      </View>
      <SafeAreaView edges={["bottom"]} style={styles.body}>
        <AppText variant="h1">{t("onboarding.welcomeTitle")}</AppText>
        <AppText tone="muted" style={{ marginTop: space.md }}>
          {t("onboarding.welcomeText")}
        </AppText>
        <View style={styles.actions}>
          <AppButton onPress={() => router.push("/onboarding")}>{t("onboarding.start")}</AppButton>
          <AppButton variant="ghost" size="md" onPress={() => router.push("/sign-in")}>
            {t("onboarding.haveAccount")}
          </AppButton>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  hero: {
    height: "52%",
    maxHeight: 460,
    borderBottomLeftRadius: 48,
    borderBottomRightRadius: 48,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  netoRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
    paddingBottom: space.md,
  },
  bubble: {
    marginBottom: 64,
    maxWidth: 176,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  body: { flex: 1, paddingHorizontal: space.xxl, paddingTop: space.xxxl },
  actions: { marginTop: "auto", gap: space.md, paddingBottom: space.lg },
});
