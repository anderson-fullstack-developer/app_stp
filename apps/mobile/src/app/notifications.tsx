import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useMe } from "@/api/queries";
import { AppButton, AppText, Card, colors, EmptyState, Neto, space } from "@/design";

/** Notificações (igual à web): lembrete do Neto se ainda não praticou hoje. */
export default function Notifications() {
  const { t } = useTranslation();
  const me = useMe();
  const practisedToday = me.data?.progress.streak.activeToday ?? true;

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={24} color={colors.foreground} />
        </Pressable>
        <AppText variant="h3">{t("settings.notifications")}</AppText>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {!practisedToday ? (
          <Card style={styles.reminder}>
            <Neto mood="worried" size={72} />
            <View style={{ flex: 1 }}>
              <AppText variant="h3">{t("neto.reminderTitle")}</AppText>
              <AppText variant="small" tone="muted">
                {t("neto.reminderText")}
              </AppText>
              <AppButton
                size="md"
                onPress={() => router.replace("/learn")}
                style={{ marginTop: space.md }}
              >
                {t("neto.reminderCta")}
              </AppButton>
            </View>
          </Card>
        ) : (
          <EmptyState title={t("neto.allCaughtUp")} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  content: { padding: space.lg },
  reminder: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderWidth: 2,
    borderColor: "rgba(244,164,55,0.5)",
  },
});
