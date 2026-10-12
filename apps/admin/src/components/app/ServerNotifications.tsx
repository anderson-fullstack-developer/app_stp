import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { NotificationDto } from "@stp/types/api";
import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Avatar } from "@/components/app/Badges";
import { AppButton } from "@/components/app/Buttons";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/Primitives";
import {
  lastSeenNotifications,
  markNotificationsSeen,
  useServerNotifications,
} from "@/hooks/use-notifications";
import { avatarColor } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import { socialApi } from "@/services/social-api.service";

/** Notificações do servidor; as novas desde a última visita ficam destacadas. */
export function ServerNotificationsList() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const list = useServerNotifications();
  // A última visita fica fixa enquanto o ecrã está aberto (para manter o destaque).
  const [seen] = useState(lastSeenNotifications);
  useEffect(() => {
    if (list.data) markNotificationsSeen();
  }, [list.data]);
  const act = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSettled: () => qc.invalidateQueries({ queryKey: ["social"] }),
  });

  if (list.isPending) return <LoadingState />;
  if (!list.data) return <ErrorState onRetry={() => void list.refetch()} />;
  if (list.data.length === 0) return <EmptyState title={t("neto.allCaughtUp")} />;

  const when = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, { day: "numeric", month: "short" });
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

  return (
    <>
      {list.data.map((n) => (
        <div
          key={n.id}
          className={cn(
            "animate-rise flex items-center gap-3 rounded-2xl p-3.5",
            n.at > seen ? "bg-primary/8 ring-2 ring-primary/30" : "card",
          )}
        >
          {n.type === "achievement" ? (
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sun">
              <Trophy className="size-5" />
            </span>
          ) : (
            <Link to="/user/$userId" params={{ userId: n.user.id }}>
              <Avatar name={n.user.name} color={avatarColor(n.user.avatarColor)} size={44} />
            </Link>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight">{text(n)}</p>
            <p className="text-xs text-muted-foreground">{when(n.at)}</p>
          </div>
          {n.type === "arena_invite" && (
            <Link to="/play/private" search={{ code: n.code }}>
              <AppButton size="sm">{t("social.join")}</AppButton>
            </Link>
          )}
          {n.type === "friend_request" && (
            <div className="flex flex-col gap-1.5">
              <AppButton size="sm" onClick={() => act.mutate(() => socialApi.accept(n.requestId))}>
                {t("social.accept")}
              </AppButton>
              <AppButton
                size="sm"
                variant="secondary"
                onClick={() => act.mutate(() => socialApi.decline(n.requestId))}
              >
                {t("social.decline")}
              </AppButton>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
