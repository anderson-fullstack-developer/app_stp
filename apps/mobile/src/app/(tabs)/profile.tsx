import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  Award,
  BookOpen,
  Coins,
  Flame,
  Languages,
  Lock,
  type LucideIcon,
  Settings,
  Star,
  Target,
  Trophy,
  Zap,
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { AchievementDto } from "@stp/types/api";
import { useApi } from "@/api/client";
import { useLanguages, useMe } from "@/api/queries";
import {
  AppText,
  Card,
  colors,
  ErrorState,
  GradientCard,
  LoadingState,
  ProgressBar,
  radius,
  space,
} from "@/design";

type AchievementKey =
  | "ACH_FIRST_LESSON"
  | "ACH_STREAK_7"
  | "ACH_STREAK_30"
  | "ACH_STREAK_100"
  | "ACH_STREAK_365"
  | "ACH_CORRECT_100"
  | "ACH_CORRECT_1000"
  | "ACH_LEVEL_10"
  | "ACH_LEVEL_25"
  | "ACH_LEVEL_50";

function Stat({ Icon, label, value }: { Icon: LucideIcon; label: string; value: string | number }) {
  return (
    <Card style={styles.stat}>
      <View style={styles.statLabel}>
        <Icon size={15} color={colors.mutedForeground} />
        <AppText variant="overline" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
          {label}
        </AppText>
      </View>
      <AppText variant="h2">{value}</AppText>
    </Card>
  );
}

/** Conquista (igual à web): ganha a cores; por ganhar a tracejado com progresso. */
function Badge({ a, title }: { a: AchievementDto; title: string }) {
  return (
    <View style={[styles.badge, a.unlocked ? styles.badgeOn : styles.badgeOff]}>
      <View
        style={[styles.badgeIcon, { backgroundColor: a.unlocked ? colors.accent : colors.muted }]}
      >
        <AppText style={{ fontSize: 28, opacity: a.unlocked ? 1 : 0.45 }}>{a.icon}</AppText>
        {!a.unlocked ? (
          <View style={styles.lock}>
            <Lock size={12} color={colors.mutedForeground} />
          </View>
        ) : null}
      </View>
      <AppText variant="caption" center numberOfLines={2} style={{ marginTop: space.sm }}>
        {title}
      </AppText>
      {!a.unlocked ? (
        <View style={styles.badgeBar}>
          <View style={[styles.badgeFill, { width: `${a.progress}%` }]} />
        </View>
      ) : null}
    </View>
  );
}

/** Perfil (igual à web), com os números do servidor. */
export default function Profile() {
  const { t, i18n } = useTranslation();
  const api = useApi();
  const me = useMe();
  const languages = useLanguages();
  const achievements = useQuery({
    queryKey: ["achievements", me.data?.id],
    queryFn: () => api.get<AchievementDto[]>("/me/achievements"),
    enabled: Boolean(me.data),
  });
  const u = me.data;
  const p = u?.progress;
  const num = (n: number) => n.toLocaleString(i18n.language === "en" ? "en-GB" : "pt-PT");
  const language = languages.data
    ?.flatMap((c) => c.languages)
    .find((l) => l.id === u?.learningLanguageId);

  return (
    <SafeAreaView edges={["top"]} style={styles.page}>
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <AppText variant="h3">{t("profile.title")}</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("settings.title")}
          onPress={() => router.push("/settings")}
          hitSlop={10}
          style={styles.gear}
        >
          <Settings size={22} color={colors.foreground} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {me.isError ? (
          <ErrorState onRetry={() => void me.refetch()} />
        ) : !u || !p ? (
          <LoadingState rows={4} />
        ) : (
          <>
            <GradientCard>
              <View style={styles.idRow}>
                <View style={styles.avatar}>
                  <AppText variant="h1" style={{ color: colors.accentForeground }}>
                    {u.name.slice(0, 1).toUpperCase()}
                  </AppText>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText variant="h2" tone="inverse" numberOfLines={1}>
                    {u.name}
                  </AppText>
                  <AppText variant="small" tone="inverse" style={{ opacity: 0.75 }}>
                    @{u.username}
                  </AppText>
                  <View style={styles.chips}>
                    {language ? (
                      <View style={styles.chip}>
                        <Languages size={13} color={colors.primaryForeground} />
                        <AppText variant="caption" tone="inverse" numberOfLines={1}>
                          {language.name}
                        </AppText>
                      </View>
                    ) : null}
                    <View style={[styles.chip, { backgroundColor: colors.primaryForeground }]}>
                      <Coins size={13} color={colors.secondary} />
                      <AppText variant="caption" style={{ color: colors.secondary }}>
                        {p.coins}
                      </AppText>
                    </View>
                  </View>
                </View>
              </View>
              <View style={styles.levelRow}>
                <AppText variant="bodyStrong" tone="inverse">
                  {t("profile.level", { level: p.level.level })}
                </AppText>
                <AppText variant="caption" tone="inverse" style={{ opacity: 0.75 }}>
                  {t("profile.toNext", {
                    xp: num(p.level.nextLevelXp - p.xpTotal),
                    next: p.level.level + 1,
                  })}
                </AppText>
              </View>
              <ProgressBar value={Math.round(p.level.progress * 100)} tone="light" />
            </GradientCard>

            <View style={styles.grid}>
              <Stat Icon={Star} label={t("profile.xpTotal")} value={num(p.xpTotal)} />
              <Stat Icon={Flame} label={t("profile.streak")} value={p.streak.current} />
              <Stat Icon={Zap} label={t("profile.longestStreak")} value={p.streak.longest} />
              <Stat Icon={BookOpen} label={t("profile.lessons")} value={p.lessonsCompleted} />
              <Stat Icon={Languages} label={t("profile.words")} value={p.wordsLearned} />
              <Stat
                Icon={Target}
                label={t("profile.accuracy")}
                value={p.accuracy === null ? "—" : `${p.accuracy}%`}
              />
              <Stat Icon={Trophy} label={t("profile.wins")} value={0} />
              <Stat Icon={Award} label={t("profile.achievements")} value={p.achievementsCount} />
            </View>

            <AppText variant="h3" style={{ marginTop: space.md }}>
              {t("profile.achievements")}
            </AppText>
            {achievements.data ? (
              <View style={styles.badges}>
                {achievements.data.map((a) => (
                  <Badge
                    key={a.key}
                    a={a}
                    title={t(`achievementsList.${a.key as AchievementKey}.title`)}
                  />
                ))}
              </View>
            ) : (
              <LoadingState rows={1} />
            )}
          </>
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
  gear: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: space.lg, paddingBottom: 48, gap: space.md },
  idRow: { flexDirection: "row", alignItems: "center", gap: space.lg },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.accent,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    maxWidth: 190,
  },
  levelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: space.xl,
    marginBottom: space.sm,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  stat: { width: "47.5%", flexGrow: 1, gap: space.sm },
  statLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  badge: {
    width: "30.5%",
    flexGrow: 1,
    alignItems: "center",
    padding: space.md,
    borderRadius: radius.xxl,
  },
  badgeOn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  badgeOff: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: "rgba(238,233,223,0.4)",
  },
  badgeIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  lock: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeBar: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginTop: 6,
    overflow: "hidden",
  },
  badgeFill: { height: 6, borderRadius: 3, backgroundColor: colors.accentDeep },
});
