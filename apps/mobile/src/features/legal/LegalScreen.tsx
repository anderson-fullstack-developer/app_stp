import { APP_NAME, LEGAL } from "@stp/config";
import { fillLegal, isAvailableLocale, type LegalKind } from "@stp/i18n";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppText, colors, space } from "@/design";

/** Política de Privacidade / Termos dentro da app (os mesmos textos da web, em @stp/i18n). */
export function LegalScreen({ kind }: { kind: LegalKind }) {
  const { t, i18n } = useTranslation();
  const locale = isAvailableLocale(i18n.language) ? i18n.language : "pt";
  const doc = fillLegal(locale, kind, {
    app: APP_NAME,
    controller: LEGAL.controller,
    age: LEGAL.minimumAge,
    email: LEGAL.supportEmail,
    date: LEGAL.updatedAt,
  });
  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <ArrowLeft size={24} color={colors.foreground} />
        </Pressable>
        <AppText variant="h3" numberOfLines={1} style={{ flex: 1, textAlign: "center" }}>
          {doc.title}
        </AppText>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="small" tone="muted">
          {doc.updated}
        </AppText>
        <AppText style={{ marginTop: space.md }}>{doc.intro}</AppText>
        {doc.sections.map((s) => (
          <View key={s.heading} style={styles.section}>
            <AppText variant="h3" accessibilityRole="header">
              {s.heading}
            </AppText>
            {s.body.map((p) =>
              p.startsWith("• ") ? (
                <View key={p} style={styles.bullet}>
                  <AppText tone="primary">•</AppText>
                  <AppText style={{ flex: 1 }}>{p.slice(2)}</AppText>
                </View>
              ) : (
                <AppText key={p} style={{ marginTop: space.sm }}>
                  {p}
                </AppText>
              ),
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  content: { paddingHorizontal: space.xl, paddingBottom: 48 },
  section: { marginTop: space.xl },
  bullet: { flexDirection: "row", gap: space.sm, marginTop: space.sm },
});
