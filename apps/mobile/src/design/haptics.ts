/**
 * Vibração curta nas interações (toque, acerto, erro). Silenciosa onde não existe (web)
 * e quando o utilizador a desliga nas Definições.
 */
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

let enabled = true;
export const setHapticsEnabled = (on: boolean) => {
  enabled = on;
};

function run(fn: () => Promise<void>) {
  if (!enabled || Platform.OS === "web") return;
  void fn().catch(() => {});
}

export const haptics = {
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  select: () => run(() => Haptics.selectionAsync()),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
