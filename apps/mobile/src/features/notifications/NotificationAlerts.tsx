/**
 * Avisa na hora quando chega uma notificação nova (igual à web): som conforme o tipo,
 * vibração e um aviso no topo do ecrã que leva ao sítio certo. As notificações que já
 * existiam quando a app abriu não tocam; durante uma partida fica em silêncio.
 */
import type { NotificationDto } from "@stp/types/api";
import { router } from "expo-router";
import { Trophy, X } from "lucide-react-native";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotifications } from "@/api/queries";
import { AppText, Avatar, colors, haptics, radius, shadows, sound, space } from "@/design";
import type { UiSound } from "@/design/sound";
import { arena } from "@/features/arena/arena";
import { notificationText } from "./text";

const SHOW_MS = 7_000;

const SOUND_FOR: Record<NotificationDto["type"], UiSound> = {
  friend_request: "notify",
  friend_accepted: "accepted",
  arena_invite: "challenge",
  achievement: "levelUp",
};

export function NotificationAlerts() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data } = useNotifications();
  const live = useSyncExternalStore(arena.subscribe, arena.getState, arena.getState);
  const known = useRef<Set<string> | null>(null);
  const [current, setCurrent] = useState<NotificationDto | null>(null);

  const announce = (fresh: NotificationDto[]) => {
    const state = arena.getState();
    const playing = state.match && state.match.phase !== "finished";
    if (!fresh.length || playing) return;
    const newest = [...fresh].sort((a, b) => b.at.localeCompare(a.at))[0]!;
    sound.play(SOUND_FOR[newest.type]);
    haptics.success();
    setCurrent(newest);
  };

  useEffect(() => {
    if (!data) return;
    if (!known.current) {
      known.current = new Set(data.map((n) => n.id));
      return;
    }
    const fresh = data.filter((n) => !known.current!.has(n.id));
    fresh.forEach((n) => known.current!.add(n.id));
    announce(fresh);
  }, [data]);

  // Convites da Arena chegam em tempo real quando a ligação da Arena está aberta.
  const invite = live.invite;
  useEffect(() => {
    if (!invite || !known.current) return;
    const id = `arena_invite:${invite.code}:${invite.from.userId}`;
    if (known.current.has(id)) return;
    known.current.add(id);
    announce([
      {
        id,
        type: "arena_invite",
        at: new Date(invite.at).toISOString(),
        code: invite.code,
        mode: invite.mode,
        expiresAt: new Date(invite.expiresAt).toISOString(),
        user: {
          id: invite.from.userId,
          username: invite.from.username,
          name: invite.from.name,
          avatarColor: invite.from.avatarColor,
        },
      },
    ]);
  }, [invite]);

  useEffect(() => {
    if (!current) return;
    const id = setTimeout(() => setCurrent(null), SHOW_MS);
    return () => clearTimeout(id);
  }, [current]);

  if (!current) return null;
  const n = current;
  const open = () => {
    setCurrent(null);
    if (n.type === "arena_invite") router.push({ pathname: "/arena", params: { code: n.code } });
    else if (n.type === "friend_accepted") router.push(`/user/${n.user.id}`);
    else router.push("/notifications");
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + space.sm }]}>
      <View style={styles.card} accessibilityLiveRegion="polite">
        <Pressable accessibilityRole="button" onPress={open} style={styles.main}>
          {n.type === "achievement" ? (
            <View style={styles.trophy}>
              <Trophy size={20} color={colors.accentForeground} />
            </View>
          ) : (
            <Avatar name={n.user.name} color={n.user.avatarColor} size={44} />
          )}
          <View style={{ flex: 1 }}>
            <AppText variant="caption" tone="muted">
              {t("settings.notifications")}
            </AppText>
            <AppText variant="bodyStrong">{notificationText(t, n)}</AppText>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          onPress={() => setCurrent(null)}
          hitSlop={10}
          style={styles.close}
        >
          <X size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: space.md, right: space.md, alignItems: "center" },
  card: {
    width: "100%",
    maxWidth: 420,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.float,
  },
  main: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.md },
  trophy: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  close: { padding: space.xs },
});
