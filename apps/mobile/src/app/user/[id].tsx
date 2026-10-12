import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Check,
  Flame,
  type LucideIcon,
  Medal,
  Star,
  Trophy,
  UserPlus,
  Zap,
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useApi } from "@/api/client";
import { usePublicProfile } from "@/api/queries";
import {
  AppButton,
  AppText,
  Avatar,
  Card,
  colors,
  ErrorState,
  haptics,
  LoadingState,
  space,
} from "@/design";

function Stat({ Icon, label, value }: { Icon: LucideIcon; label: string; value: number }) {
  return (
    <Card style={styles.stat}>
      <View style={styles.statLabel}>
        <Icon size={15} color={colors.mutedForeground} />
        <AppText variant="overline" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
          {label}
        </AppText>
      </View>
      <AppText variant="h2">{value.toLocaleString()}</AppText>
    </Card>
  );
}

/** Perfil público de outra pessoa (igual à web): estatísticas e o botão de amizade certo. */
export default function UserProfile() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const qc = useQueryClient();
  const profile = usePublicProfile(id ?? "");
  const act = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => haptics.success(),
    onSettled: () => qc.invalidateQueries({ queryKey: ["social"] }),
  });
  const u = profile.data;
  const countries = t("countries", { returnObjects: true }) as Record<string, string>;

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={24} color={colors.foreground} />
        </Pressable>
        <AppText variant="h3">{u ? `@${u.username}` : t("social.profileTitle")}</AppText>
        <View style={{ width: 24 }} />
      </View>
      {profile.isPending ? (
        <LoadingState />
      ) : !u ? (
        <ErrorState text={t("social.notFound")} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Avatar name={u.name} color={u.avatarColor} size={104} />
            <AppText variant="h1" center style={{ marginTop: space.md }}>
              {u.name}
            </AppText>
            <AppText variant="small" tone="muted" center>
              {u.countryCode ? `${countries[u.countryCode] ?? u.countryCode} · ` : ""}
              {t("social.memberSince", {
                date: new Date(u.memberSince).toLocaleDateString(i18n.language, {
                  month: "long",
                  year: "numeric",
                }),
              })}
            </AppText>
          </View>
          <View style={styles.grid}>
            <Stat Icon={Star} label={t("social.statLevel")} value={u.level} />
            <Stat Icon={Zap} label={t("social.statWeekly")} value={u.weeklyXp} />
            <Stat Icon={Award} label={t("social.statTotal")} value={u.xpTotal} />
            <Stat Icon={Flame} label={t("social.statStreak")} value={u.streak} />
            <Stat Icon={Medal} label={t("social.statBestStreak")} value={u.longestStreak} />
            <Stat Icon={BookOpen} label={t("social.statLessons")} value={u.lessonsCompleted} />
          </View>
          <Stat Icon={Trophy} label={t("social.statAchievements")} value={u.achievements} />

          <View style={{ marginTop: space.lg }}>
            {u.isMe ? (
              <AppText variant="small" tone="muted" center>
                {t("social.thisIsYou")}
              </AppText>
            ) : u.relationship === "friends" ? (
              <AppButton
                variant="secondary"
                disabled
                icon={<Check size={18} color={colors.foreground} />}
              >
                {t("social.friends")}
              </AppButton>
            ) : u.relationship === "pending_out" && u.requestId ? (
              <AppButton
                variant="secondary"
                loading={act.isPending}
                onPress={() =>
                  act.mutate(() => api.post(`/friends/requests/${u.requestId}/decline`))
                }
              >
                {t("social.cancel")}
              </AppButton>
            ) : u.relationship === "pending_in" && u.requestId ? (
              <AppButton
                loading={act.isPending}
                icon={<Check size={18} color={colors.primaryForeground} />}
                onPress={() =>
                  act.mutate(() => api.post(`/friends/requests/${u.requestId}/accept`))
                }
              >
                {t("social.accept")}
              </AppButton>
            ) : (
              <AppButton
                loading={act.isPending}
                icon={<UserPlus size={18} color={colors.primaryForeground} />}
                onPress={() => act.mutate(() => api.post("/friends/requests", { userId: u.id }))}
              >
                {t("social.add")}
              </AppButton>
            )}
            {act.isError && (
              <AppText variant="small" tone="danger" center style={{ marginTop: space.sm }}>
                {t("social.error")}
              </AppText>
            )}
          </View>
        </ScrollView>
      )}
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
  content: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  hero: { alignItems: "center", marginBottom: space.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  stat: { flexGrow: 1, flexBasis: "45%", gap: 4 },
  statLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
});
