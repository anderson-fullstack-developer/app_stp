import type { NotificationDto } from "@stp/types/api";
import type { TFunction } from "i18next";

/** Texto de uma notificação (lista e aviso no topo do ecrã). */
export function notificationText(t: TFunction, n: NotificationDto): string {
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
}
