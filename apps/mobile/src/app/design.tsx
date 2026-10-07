import { Coins, Flame, Star } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  AppButton,
  AppText,
  Card,
  colors,
  EmptyState,
  ErrorState,
  GradientCard,
  LoadingState,
  Neto,
  OfflineState,
  ProgressBar,
  space,
  StatPill,
} from "@/design";

/**
 * Amostra do design system (passo 3.1): todos os componentes base num só ecrã, para rever
 * o aspeto no telemóvel antes de construir os ecrãs da app.
 */
export default function DesignScreen() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.page}>
        <AppText variant="overline" tone="primary">
          Design system · {i18n.language.toUpperCase()}
        </AppText>
        <AppText variant="display">Fala Neto</AppText>
        <AppText tone="muted">{t("onboarding.welcomeText")}</AppText>

        <View style={styles.row}>
          <StatPill tone="streak" icon={<Flame size={18} color={colors.destructive} />} value={7} />
          <StatPill tone="xp" icon={<Star size={18} color={colors.accentDeep} />} value="1 240" />
          <StatPill tone="coins" icon={<Coins size={18} color={colors.secondary} />} value={85} />
        </View>

        <GradientCard>
          <AppText variant="overline" tone="inverse" style={{ opacity: 0.8 }}>
            {t("kriolu.learningLabel")}
          </AppText>
          <AppText variant="h2" tone="inverse">
            Kriolu · {t("kriolu.beta")}
          </AppText>
          <View style={{ marginTop: space.md }}>
            <ProgressBar value={62} tone="light" />
          </View>
        </GradientCard>

        <Card>
          <AppText variant="h3">{t("neto.introTitle")}</AppText>
          <View style={styles.netos}>
            <Neto mood="happy" size={72} />
            <Neto mood="celebrate" size={72} />
            <Neto mood="sad" size={72} />
            <Neto mood="worried" size={72} />
          </View>
        </Card>

        <View style={{ gap: space.md }}>
          <AppButton
            loading={loading}
            onPress={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 1200);
            }}
          >
            {t("onboarding.start")}
          </AppButton>
          <AppButton variant="sun">{t("neto.reminderCta")}</AppButton>
          <AppButton variant="secondary">{t("onboarding.haveAccount")}</AppButton>
          <AppButton variant="danger">{t("common.continue")}</AppButton>
          <AppButton variant="ghost" size="md">
            {t("result.repeat")}
          </AppButton>
        </View>

        <Card style={{ padding: 0 }}>
          <LoadingState rows={2} />
        </Card>
        <Card>
          <EmptyState title={t("neto.noFriendsTitle")} text={t("neto.noFriendsText")} />
        </Card>
        <Card>
          <ErrorState onRetry={() => {}} />
        </Card>
        <Card>
          <OfflineState onRetry={() => {}} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.lg, paddingBottom: 48 },
  row: { flexDirection: "row", gap: space.sm },
  netos: { flexDirection: "row", justifyContent: "space-between", marginTop: space.md },
});
