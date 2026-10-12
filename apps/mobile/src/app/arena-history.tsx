import type { ArenaHistoryDto } from "@stp/types/api";
import { router } from "expo-router";
import { ArrowLeft, Trophy } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useArenaHistory } from "@/api/queries";
import {
  AppButton,
  AppText,
  Card,
  colors,
  EmptyState,
  ErrorState,
  LoadingState,
  space,
} from "@/design";

const MODE_KEY = {
  survival: "arena.modeSurvival",
  duel: "arena.modeDuel",
  teams: "arena.modeTeams",
} as const;

function Row({ m }: { m: ArenaHistoryDto }) {
  const { t, i18n } = useTranslation();
  const won = m.place === 1 && !m.left;
  const date = new Date(m.finishedAt).toLocaleString(i18n.language, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <Card style={[styles.row, won && styles.won]}>
      <View style={[styles.place, won && { backgroundColor: colors.accent }]}>
        {won ? (
          <Trophy size={22} color={colors.accentForeground} />
        ) : (
          <AppText variant="h3">{m.left ? "—" : t("arena.placeShort", { place: m.place })}</AppText>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong">
          {m.left
            ? t("arena.historyLeft")
            : won
              ? t("arena.historyWon")
              : t("arena.place", { place: m.place })}{" "}
          <AppText variant="small" tone="muted">
            {t("arena.historyOf", { count: m.players })}
          </AppText>
        </AppText>
        <AppText variant="caption" tone="muted">
          {t("arena.historyLine", {
            mode: m.mode in MODE_KEY ? t(MODE_KEY[m.mode as keyof typeof MODE_KEY]) : m.mode,
            correct: m.correct,
            date,
          })}
        </AppText>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        {m.xp > 0 ? (
          <>
            <AppText variant="caption" tone="primary">
              +{m.xp} XP
            </AppText>
            <AppText variant="caption" tone="accent">
              +{m.coins}
            </AppText>
          </>
        ) : (
          <AppText variant="caption" tone="muted">
            {m.rewarded ? "—" : t("arena.noPrize")}
          </AppText>
        )}
      </View>
    </Card>
  );
}

/** As minhas últimas partidas da Arena (igual à web). */
export default function ArenaHistory() {
  const { t } = useTranslation();
  const matches = useArenaHistory();
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={24} color={colors.foreground} />
        </Pressable>
        <AppText variant="h3">{t("arena.history")}</AppText>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {matches.isPending ? (
          <LoadingState />
        ) : !matches.data ? (
          <ErrorState onRetry={() => void matches.refetch()} />
        ) : matches.data.length === 0 ? (
          <>
            <EmptyState title={t("arena.historyEmptyTitle")} text={t("arena.historyEmptyText")} />
            <AppButton onPress={() => router.replace("/arena")}>{t("arena.createRoom")}</AppButton>
          </>
        ) : (
          matches.data.map((m) => <Row key={m.matchId} m={m} />)
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
  content: { padding: space.lg, gap: space.sm, paddingBottom: 48 },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  won: { borderColor: colors.accent },
  place: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
});
