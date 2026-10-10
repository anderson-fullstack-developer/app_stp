import type { RankingEntryDto, RankingScopeDto } from "@stp/types/api";
import { LinearGradient } from "expo-linear-gradient";
import { Crown } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/api/client";
import { useRanking } from "@/api/queries";
import {
  AppText,
  Avatar,
  Card,
  colors,
  EmptyState,
  ErrorState,
  LoadingState,
  space,
  Tabs,
} from "@/design";

const PODIUM = {
  1: { height: 112, colors: ["#fdd75a", "#e9a92b"] },
  2: { height: 80, colors: ["#e3e6ea", "#b7bdc6"] },
  3: { height: 56, colors: ["#cf9a6c", "#a8673f"] },
} as const;

/** Ranking (igual à web): semanal, global, amigos e país, calculado no servidor. */
export default function RankingTab() {
  const { t, i18n } = useTranslation();
  const [scope, setScope] = useState<RankingScopeDto>("weekly");
  const ranking = useRanking(scope);
  const data = ranking.data;
  const noCountry = ranking.error instanceof ApiError && ranking.error.status === 422;
  const xp = (n: number) => `${n.toLocaleString(i18n.language)} XP`;

  const top3 = data?.top.slice(0, 3) ?? [];
  const podium = [top3[1], top3[0], top3[2]].filter((e): e is RankingEntryDto => !!e);
  const meOutside = data?.me && !data.top.some((e) => e.isMe) ? data.me : null;

  return (
    <SafeAreaView edges={["top"]} style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="h2">{t("nav.ranking")}</AppText>
        <Tabs
          value={scope}
          onChange={setScope}
          items={[
            { value: "friends", label: t("social.rankingFriends") },
            { value: "weekly", label: t("social.rankingWeekly") },
            { value: "global", label: t("social.rankingGlobal") },
            { value: "country", label: t("social.rankingCountry") },
          ]}
        />
        {noCountry ? (
          <EmptyState title={t("social.rankingNoCountry")} />
        ) : ranking.isError ? (
          <ErrorState onRetry={() => void ranking.refetch()} />
        ) : !data ? (
          <LoadingState />
        ) : data.top.length === 0 ? (
          <EmptyState title={t("social.rankingEmpty")} />
        ) : (
          <>
            <View style={styles.podium}>
              {podium.map((e) => {
                const place = (e.position <= 3 ? e.position : 3) as 1 | 2 | 3;
                const first = place === 1;
                return (
                  <View key={e.userId} style={styles.podiumCol}>
                    <View style={{ height: 26, opacity: first ? 1 : 0 }}>
                      <Crown size={24} color={colors.accentDeep} fill={colors.accentDeep} />
                    </View>
                    <Avatar name={e.name} color={e.avatarColor} size={first ? 64 : 52} />
                    <AppText variant="caption" numberOfLines={1} style={{ marginTop: 4 }}>
                      {e.name}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {xp(e.xp)}
                    </AppText>
                    <LinearGradient
                      colors={PODIUM[place].colors}
                      style={[styles.step, { height: PODIUM[place].height }]}
                    >
                      <AppText variant="h2" style={{ color: "rgba(255,255,255,0.9)" }}>
                        {e.position}
                      </AppText>
                    </LinearGradient>
                  </View>
                );
              })}
            </View>
            {data.top.slice(3).map((e) => (
              <Row key={e.userId} e={e} xp={xp(e.xp)} you={t("social.rankingYou")} />
            ))}
            {meOutside && (
              <>
                <AppText variant="overline" tone="muted" style={{ marginTop: space.md }}>
                  {t("social.rankingYourPlace")}
                </AppText>
                <Row e={meOutside} xp={xp(meOutside.xp)} you={t("social.rankingYou")} />
              </>
            )}
            <AppText variant="caption" tone="muted" center style={{ marginTop: space.md }}>
              {t("social.rankingParticipants", { count: data.participants })}
              {data.weekStart ? ` · ${t("social.rankingResets")}` : ""}
            </AppText>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ e, xp, you }: { e: RankingEntryDto; xp: string; you: string }) {
  return (
    <Card style={[styles.row, e.isMe && styles.rowMe]}>
      <AppText variant="bodyStrong" tone="muted" style={{ width: 24, textAlign: "center" }}>
        {e.position}
      </AppText>
      <Avatar name={e.name} color={e.avatarColor} size={40} />
      <AppText variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
        {e.name}
        {e.isMe ? (
          <AppText variant="caption" tone="primary">
            {` (${you})`}
          </AppText>
        ) : null}
      </AppText>
      <AppText variant="h3">{xp}</AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.sm, paddingBottom: 48 },
  podium: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: space.md,
    marginTop: space.lg,
    marginBottom: space.sm,
  },
  podiumCol: { width: 96, alignItems: "center" },
  step: {
    alignSelf: "stretch",
    marginTop: space.sm,
    alignItems: "center",
    paddingTop: space.sm,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md },
  rowMe: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
});
