import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { useNotifications } from "@/api/queries";

/** Mesma chave que o ecrã de notificações grava ao abrir. */
export const NOTIFICATIONS_SEEN_KEY = "falaneto:notifications-seen";

/** Há alguma notificação mais recente do que a última visita ao ecrã de notificações? */
export function useHasUnreadNotifications(): boolean {
  const list = useNotifications();
  const [seen, setSeen] = useState<string | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(NOTIFICATIONS_SEEN_KEY)
      .then((v) => setSeen(v ?? ""))
      .catch(() => setSeen(""));
  }, [list.dataUpdatedAt]);
  if (seen === null || !list.data) return false;
  return list.data.some((n) => n.at > seen);
}
