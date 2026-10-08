import { useUser } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCircle2, Coins, Flame, Star, Zap } from "lucide-react-native";
import { useState } from "react";
import { router } from "expo-router";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  useCourse,
  useDailyOverview,
  useLanguages,
  useLearningLanguage,
  useLessonProgress,
  useMe,
} from "@/api/queries";
import {
  AppText,
  Card,
  colors,
  ErrorState,
  GradientCard,
  LoadingState,
  ProgressBar,
  space,
  StatPill,
} from "@/design";
import { LessonPath } from "@/features/learn/LessonPath";
import { StreakCard } from "@/features/learn/StreakCard";

/** Aprender (igual à web): cabeçalho, estatísticas, nível, sequência, desafio e caminho. */
export default function Learn() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { user } = useUser();
  const me = useMe();
  const lang = useLearningLanguage();
  const languages = useLanguages();
  const course = useCourse(lang);
  const progress = useLessonProgress(lang);
  const daily = useDailyOverview(lang);
  const [refreshing, setRefreshing] = useState(false);

  const p = me.data?.progress;
  const name = user?.firstName ?? me.data?.name ?? "…";
  const language = languages.data?.flatMap((c) => c.languages).find((l) => l.id === lang);
  const states = new Map((progress.data?.lessons ?? []).map((l) => [l.lessonId, l.state]));
  const levelPct = p ? Math.round(p.level.progress * 100) : 0;
  const dailyDone = daily.data?.me?.status === "COMPLETED";

  const refresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setRefreshing(false);
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <AppText variant="h3" tone="inverse">
              {name.slice(0, 1).toUpperCase()}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="caption" tone="muted">
              {t("learn.hello")}
            </AppText>
            <AppText variant="h3" numberOfLines={1}>
              {name}
            </AppText>
          </View>
          <View style={styles.bell}>
            <Bell size={20} color={colors.foreground} />
          </View>
        </View>
        <View style={styles.pills}>
          <StatPill
            tone="streak"
            icon={<Flame size={18} color={colors.destructive} />}
            value={p?.streak.current ?? "–"}
          />
          <StatPill
            tone="xp"
            icon={<Star size={18} color={colors.accentDeep} fill={colors.accentDeep} />}
            value={p?.xpTotal ?? "–"}
          />
          <StatPill
            tone="coins"
            icon={<Coins size={18} color={colors.secondary} />}
            value={p?.coins ?? "–"}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
      >
        {me.isError ? (
          <ErrorState onRetry={() => void me.refetch()} />
        ) : !p || !course.data ? (
          <LoadingState rows={4} />
        ) : (
          <>
            <GradientCard>
              <View style={styles.levelTop}>
                <View style={{ flex: 1 }}>
                  <AppText variant="overline" tone="inverse" style={{ opacity: 0.75 }}>
                    {t("kriolu.learningLabel")}
                  </AppText>
                  <View style={styles.langRow}>
                    <AppText
                      variant="h3"
                      tone="inverse"
                      numberOfLines={1}
                      style={{ flexShrink: 1 }}
                    >
                      {language?.name ?? course.data.language.name}
                    </AppText>
                    {course.data.language.beta ? (
                      <View style={styles.beta}>
                        <AppText variant="caption" style={{ fontSize: 10 }}>
                          {t("kriolu.beta")}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                </View>
                <View style={styles.levelChip}>
                  <AppText variant="bodyStrong" tone="inverse">
                    {t("profile.level", { level: p.level.level })}
                  </AppText>
                </View>
              </View>
              <View style={styles.levelBar}>
                <View style={{ flex: 1 }}>
                  <ProgressBar value={levelPct} tone="light" />
                </View>
                <AppText variant="bodyStrong" tone="inverse">
                  {levelPct}%
                </AppText>
              </View>
              <AppText variant="caption" tone="inverse" style={{ opacity: 0.8, marginTop: 6 }}>
                {t("profile.toNext", {
                  xp: p.level.nextLevelXp - p.xpTotal,
                  next: p.level.level + 1,
                })}
              </AppText>
            </GradientCard>

            <StreakCard
              streak={p.streak.current}
              longest={p.streak.longest}
              week={p.week}
              todayIndex={p.todayIndex}
            />

            {daily.data ? (
              <Pressable accessibilityRole="button" onPress={() => router.push("/daily")}>
                {dailyDone ? (
                  <Card style={[styles.daily, styles.dailyDone]}>
                    <View style={styles.dailyIcon}>
                      <CheckCircle2 size={24} color={colors.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyStrong">{t("daily.title")}</AppText>
                      <AppText variant="caption" tone="muted">
                        {t("daily.score", {
                          correct: daily.data.me!.correct,
                          total: daily.data.me!.total,
                        })}
                      </AppText>
                    </View>
                  </Card>
                ) : (
                  <GradientCard gradient="sun" style={styles.daily}>
                    <View style={styles.dailyIcon}>
                      <Zap
                        size={24}
                        color={colors.accentForeground}
                        fill={colors.accentForeground}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyStrong" style={{ color: colors.accentForeground }}>
                        {t("daily.title")}
                      </AppText>
                      <AppText
                        variant="caption"
                        style={{ color: colors.accentForeground, opacity: 0.8 }}
                      >
                        {t("daily.questions", { count: daily.data.questions })} · +
                        {daily.data.xpReward} XP ·{" "}
                        {t("kriolu.coinsGained", { count: daily.data.coinReward })}
                      </AppText>
                    </View>
                    <View style={styles.dailyChip}>
                      <AppText variant="caption" style={{ color: colors.accentForeground }}>
                        {t("daily.completeToday")}
                      </AppText>
                    </View>
                  </GradientCard>
                )}
              </Pressable>
            ) : null}

            <LessonPath course={course.data} states={states} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.md,
    backgroundColor: colors.background,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  pills: { flexDirection: "row", gap: space.sm, marginTop: space.md },
  content: { paddingHorizontal: space.lg, paddingBottom: 48, gap: space.md },
  levelTop: { flexDirection: "row", alignItems: "center", gap: space.md },
  langRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  beta: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  levelChip: {
    backgroundColor: "rgba(253,250,243,0.15)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  levelBar: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.md },
  daily: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg },
  dailyDone: { borderWidth: 1.5, borderColor: colors.success, backgroundColor: colors.successSoft },
  dailyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  dailyChip: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
