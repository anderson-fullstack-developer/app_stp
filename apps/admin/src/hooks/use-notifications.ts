import { useQuery } from "@tanstack/react-query";
import { useServerLessonsEnabled } from "@/hooks/use-server-lessons";
import { socialApi, socialKeys } from "@/services/social-api.service";

const SEEN_KEY = "falaneto:notifications-seen";

/** Quando a pessoa abriu as notificações pela última vez (só neste navegador). */
export function lastSeenNotifications(): string {
  try {
    return localStorage.getItem(SEEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function markNotificationsSeen() {
  try {
    localStorage.setItem(SEEN_KEY, new Date().toISOString());
  } catch {
    // Sem armazenamento (modo privado): o ponto vermelho volta a aparecer, sem problema.
  }
}

/** Notificações do servidor (só com sessão). */
export function useServerNotifications() {
  const enabled = useServerLessonsEnabled();
  return useQuery({
    queryKey: socialKeys.notifications,
    queryFn: socialApi.notifications,
    enabled,
    refetchInterval: 60_000,
  });
}

/** Há alguma notificação mais recente do que a última visita? (demonstração: sempre sim) */
export function useHasUnreadNotifications() {
  const server = useServerLessonsEnabled();
  const { data } = useServerNotifications();
  if (!server) return true;
  const seen = lastSeenNotifications();
  return (data ?? []).some((n) => n.at > seen);
}
