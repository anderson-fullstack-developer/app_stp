import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { NotificationDto } from "@stp/types/api";
import { router } from "expo-router";
import { ArrowLeft, Trophy } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useApi } from "@/api/client";
import { useMe, useNotifications } from "@/api/queries";
import { NOTIFICATIONS_SEEN_KEY } from "@/features/notifications/useUnread";
import {
  AppButton,
  AppText,
  Avatar,
  Card,
  colors,
  EmptyState,
  ErrorState,
  haptics,
  LoadingState,
  Neto,
  space,
} from "@/design";

/** Notificações (igual à web): lembrete do Neto e o que o servidor envia. */
export default function Notifications() {
  const { t, i18n } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const me = useMe();
  const list = useNotifications();
  const practisedToday = me.data?.progress.streak.activeToday ?? true;
  // A última visita fica fixa enquanto o ecrã está aberto (para manter o destaque).
  const [seen, setSeen] = useState<string | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(NOTIFICATIONS_SEEN_KEY)
      .then((v) => setSeen(v ?? ""))
      .catch(() => setSeen(""));
  }, []);
  useEffect(() => {
    if (list.data) {
      void AsyncStorage.setItem(NOTIFICATIONS_SEEN_KEY, new Date().toISOString()).catch(() => {});
    }
  }, [list.data]);
  const act = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => haptics.success(),
    onSettled: () => qc.invalidateQueries({ queryKey: ["social"] }),
  });

  const text = (n: NotificationDto) => {
    if (n.type === "friend_request") return t("social.notifFriendRequest", { name: n.user.name });
    if (n.type === "friend_accepted") return t("social.notifFriendAccepted", { name: n.user.name });
    if (n.type === "arena_invite") {
      return n.mode === "duel"
        ? t("social.notifDuelInvite", { name: n.user.name })
        : t("social.notifArenaInvite", { name: n.user.name });
    }
    const titles = t("achievementsList", { returnObjects: true }) as Record<
      string,
      { title: string }
    >;
    return t("social.notifAchievement", {
      title: titles[n.achievementKey]?.title ?? n.achievementKey,
    });
  };
  const when = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, { day: "numeric", month: "short" });

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
        {!practisedToday && (
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
        )}
        {list.isPending ? (
          <LoadingState />
        ) : !list.data ? (
          <ErrorState onRetry={() => void list.refetch()} />
        ) : list.data.length === 0 ? (
          practisedToday ? (
            <EmptyState title={t("neto.allCaughtUp")} />
          ) : null
        ) : (
          list.data.map((n) => {
            const fresh = seen !== null && n.at > seen;
            return (
              <Card key={n.id} style={[styles.row, fresh && styles.fresh]}>
                {n.type === "achievement" ? (
                  <View style={styles.trophy}>
                    <Trophy size={20} color={colors.accentForeground} />
                  </View>
                ) : (
                  <Pressable onPress={() => router.push(`/user/${n.user.id}`)}>
                    <Avatar name={n.user.name} color={n.user.avatarColor} size={44} />
                  </Pressable>
                )}
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{text(n)}</AppText>
                  <AppText variant="caption" tone="muted">
                    {when(n.at)}
                  </AppText>
                </View>
                {n.type === "friend_request" && (
                  <View style={{ gap: 6 }}>
                    <AppButton
                      size="md"
                      onPress={() =>
                        act.mutate(() => api.post(`/friends/requests/${n.requestId}/accept`))
                      }
                    >
                      {t("social.accept")}
                    </AppButton>
                    <AppButton
                      size="md"
                      variant="secondary"
                      onPress={() =>
                        act.mutate(() => api.post(`/friends/requests/${n.requestId}/decline`))
                      }
                    >
                      {t("social.decline")}
                    </AppButton>
                  </View>
                )}
                {n.type === "arena_invite" && (
                  <AppButton
                    size="md"
                    onPress={() => router.push({ pathname: "/arena", params: { code: n.code } })}
                  >
                    {t("social.join")}
                  </AppButton>
                )}
              </Card>
            );
          })
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
  reminder: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderWidth: 2,
    borderColor: "rgba(244,164,55,0.5)",
    marginBottom: space.sm,
  },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  fresh: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  trophy: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
});
