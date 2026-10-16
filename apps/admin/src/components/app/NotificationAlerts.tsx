/**
 * Avisa na hora quando chega uma notificação nova, em qualquer ecrã: toca um som (conforme o
 * tipo) e mostra um aviso no topo, que leva ao sítio certo. As notificações já existentes
 * quando a página abre não tocam. Durante uma partida fica em silêncio (o ponto vermelho
 * continua a avisar). Respeita as Definições (Notificações, Som, Vibração).
 */
import { useNavigate } from "@tanstack/react-router";
import type { NotificationDto } from "@stp/types/api";
import { Trophy, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Avatar } from "@/components/app/Badges";

import { useServerNotifications } from "@/hooks/use-notifications";
import { settings } from "@/hooks/use-settings";
import { avatarColor } from "@/lib/avatar";
import { notificationText } from "@/lib/notification-text";
import { arena } from "@/lib/multiplayer/arena-client";
import { type SoundName, sound } from "@/lib/sound";

const SHOW_MS = 7_000;

const SOUND_FOR: Record<NotificationDto["type"], SoundName> = {
  friend_request: "notify",
  friend_accepted: "accepted",
  arena_invite: "challenge",
  achievement: "levelUp",
};

export function NotificationAlerts() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data } = useServerNotifications();
  const live = useSyncExternalStore(arena.subscribe, arena.getState, arena.getState);
  const known = useRef<Set<string> | null>(null);
  const [current, setCurrent] = useState<NotificationDto | null>(null);

  const announce = (fresh: NotificationDto[]) => {
    const state = arena.getState();
    const playing = state.match && state.match.phase !== "finished";
    if (!fresh.length || playing || !settings.get().notifications) return;
    const newest = [...fresh].sort((a, b) => b.at.localeCompare(a.at))[0]!;
    sound.play(SOUND_FOR[newest.type]);
    setCurrent(newest);
  };

  // Notificações do servidor (verificadas a cada 20 s).
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
    if (n.type === "arena_invite") navigate({ to: "/play/private", search: { code: n.code } });
    else if (n.type === "friend_accepted") {
      navigate({ to: "/user/$userId", params: { userId: n.user.id } });
    } else if (n.type === "achievement") navigate({ to: "/achievements" });
    else navigate({ to: "/notifications" });
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
      <div
        role="status"
        aria-live="polite"
        className="animate-rise pointer-events-auto flex w-full max-w-[420px] items-center gap-3 rounded-2xl bg-surface p-3 shadow-float ring-1 ring-border/70"
      >
        <button
          type="button"
          onClick={open}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          {n.type === "achievement" ? (
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sun">
              <Trophy className="size-5" />
            </span>
          ) : (
            <Avatar name={n.user.name} color={avatarColor(n.user.avatarColor)} size={44} />
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-muted-foreground">
              {t("settings.notifications")}
            </span>
            <span className="block font-semibold leading-tight">{notificationText(t, n)}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setCurrent(null)}
          aria-label={t("common.close")}
          className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
