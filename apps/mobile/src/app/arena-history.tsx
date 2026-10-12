import type { ArenaHistoryDto } from "@stp/types/api";
import { router } from "expo-router";
import { ArrowLeft, Trophy } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

const MODE: Record<string, string> = {
  survival: "💀 Sobrevivência",
  duel: "⚔️ Duelo",
  teams: "👥 2 contra 2",
};

function Row({ m }: { m: ArenaHistoryDto }) {
  const won = m.place === 1 && !m.left;
  const date = new Date(m.finishedAt).toLocaleString("pt-PT", {
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
          <AppText variant="h3">{m.left ? "—" : `${m.place}.º`}</AppText>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong">
          {m.left ? "Saíste a meio" : won ? "Vitória!" : `${m.place}.º lugar`}{" "}
          <AppText variant="small" tone="muted">
            de {m.players}
          </AppText>
        </AppText>
        <AppText variant="caption" tone="muted">
          {MODE[m.mode] ?? m.mode} · {m.correct} certas · {date}
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
            {m.rewarded ? "—" : "sem prémio"}
          </AppText>
        )}
      </View>
    </Card>
  );
}

/** As minhas últimas partidas da Arena (igual à web). */
export default function ArenaHistory() {
  const matches = useArenaHistory();
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={24} color={colors.foreground} />
        </Pressable>
        <AppText variant="h3">Histórico de partidas</AppText>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {matches.isPending ? (
          <LoadingState />
        ) : !matches.data ? (
          <ErrorState onRetry={() => void matches.refetch()} />
        ) : matches.data.length === 0 ? (
          <>
            <EmptyState
              title="Ainda não jogaste na Arena"
              text="Cria uma sala privada e desafia os teus amigos."
            />
            <AppButton onPress={() => router.replace("/arena")}>Criar sala</AppButton>
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
