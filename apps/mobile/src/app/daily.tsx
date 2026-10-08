import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ArrowLeft, CheckCircle2, Users, Zap } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useApi } from "@/api/client";
import { useDailyOverview, useLearningLanguage } from "@/api/queries";
import {
  AppButton,
  AppText,
  Card,
  colors,
  GradientCard,
  LoadingState,
  Neto,
  space,
} from "@/design";

interface RankingDto {
  top: {
    position: number;
    userId: string;
    name: string;
    correct: number;
    total: number;
    durationMs: number;
    isMe: boolean;
  }[];
}

/** Desafio do dia (igual à web): recompensas, o meu resultado e o ranking de hoje. */
export default function DailyScreen() {
  const { t } = useTranslation();
  const api = useApi();
  const lang = useLearningLanguage();
  const overview = useDailyOverview(lang);
  const ranking = useQuery({
    queryKey: ["daily-ranking", lang],
    queryFn: () => api.get<RankingDto>(`/daily/${lang}/ranking`),
    enabled: overview.isSuccess,
  });
  const o = overview.data;
  const done = o?.me?.status === "COMPLETED";

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={24} color={colors.foreground} />
        </Pressable>
        <AppText variant="h3">{t("daily.title")}</AppText>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {overview.isPending ? (
          <LoadingState rows={2} />
        ) : !o ? (
          <View style={{ alignItems: "center", paddingVertical: space.xxxl }}>
            <Neto mood="worried" size={112} />
            <AppText variant="h3" center style={{ marginTop: space.lg }}>
              {t("daily.notAvailable")}
            </AppText>
          </View>
        ) : (
          <GradientCard gradient="sun">
            <View style={styles.cardTop}>
              <View style={styles.zap}>
                <Zap size={32} color={colors.accentForeground} fill={colors.accentForeground} />
              </View>
              <Neto mood={done ? "celebrate" : "happy"} size={72} />
            </View>
            <AppText variant="h1" style={{ color: colors.accentForeground, marginTop: space.sm }}>
              {t("daily.title")}
            </AppText>
            <AppText variant="bodyStrong" style={{ color: colors.accentForeground, opacity: 0.8 }}>
              {t("daily.questions", { count: o.questions })} ·{" "}
              {done ? `✓ ${t("daily.doneToday")}` : t("daily.completeToday")}
            </AppText>
            <View style={styles.rewards}>
              <View style={styles.reward}>
                <AppText variant="bodyStrong" style={{ color: colors.accentForeground }}>
                  +{o.xpReward} XP
                </AppText>
              </View>
              <View style={styles.reward}>
                <AppText variant="bodyStrong" style={{ color: colors.accentForeground }}>
                  {t("kriolu.coinsGained", { count: o.coinReward })}
                </AppText>
              </View>
            </View>
            <View style={styles.participants}>
              <Users size={16} color={colors.accentForeground} />
              <AppText variant="small" style={{ color: colors.accentForeground }}>
                {t("daily.participants", { count: o.participants })}
              </AppText>
            </View>
            {done ? (
              <View style={styles.doneBox}>
                <View style={styles.doneRow}>
                  <CheckCircle2 size={20} color={colors.success} />
                  <AppText variant="bodyStrong" tone="success">
                    {t("daily.score", { correct: o.me!.correct, total: o.me!.total })}
                  </AppText>
                </View>
                {o.me!.rank ? (
                  <AppText variant="small" center>
                    {t("daily.rank", { rank: o.me!.rank })}
                  </AppText>
                ) : null}
              </View>
            ) : (
              <AppButton onPress={() => router.push("/daily-play")} style={{ marginTop: space.xl }}>
                {o.me ? t("daily.resume") : t("daily.play")}
              </AppButton>
            )}
          </GradientCard>
        )}

        <AppText variant="h3" style={{ marginTop: space.lg }}>
          {t("daily.ranking")}
        </AppText>
        {ranking.data && ranking.data.top.length === 0 ? (
          <AppText variant="small" tone="muted">
            {t("daily.noRanking")}
          </AppText>
        ) : (
          ranking.data?.top.slice(0, 10).map((e) => (
            <Card key={e.userId} style={[styles.rankRow, e.isMe && styles.rankMe]}>
              <AppText variant="bodyStrong" tone="muted" style={{ width: 24, textAlign: "center" }}>
                {e.position}
              </AppText>
              <View style={styles.rankAvatar}>
                <AppText variant="bodyStrong" tone="inverse">
                  {e.name.slice(0, 1).toUpperCase()}
                </AppText>
              </View>
              <AppText variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                {e.name}
                {e.isMe ? ` (${t("daily.you")})` : ""}
              </AppText>
              <View style={{ alignItems: "flex-end" }}>
                <AppText variant="bodyStrong">
                  {e.correct}/{e.total}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {t("daily.seconds", { s: Math.round(e.durationMs / 1000) })}
                </AppText>
              </View>
            </Card>
          ))
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
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  zap: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  rewards: { flexDirection: "row", gap: space.sm, marginTop: space.lg },
  reward: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  participants: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: space.lg },
  doneBox: {
    marginTop: space.xl,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 16,
    padding: space.lg,
    gap: 4,
  },
  doneRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  rankRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md },
  rankMe: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  rankAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.ocean,
    alignItems: "center",
    justifyContent: "center",
  },
});
