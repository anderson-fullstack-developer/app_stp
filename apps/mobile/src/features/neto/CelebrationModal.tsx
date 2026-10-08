import { useEffect, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppButton, AppText, colors, haptics, Neto, shadows, sound, space } from "@/design";

export type Celebration = { kind: "levelUp"; level: number } | { kind: "streak"; days: number };

/** Celebrações a mostrar depois de uma atividade (subiu de nível; manteve a sequência hoje). */
export function celebrationsFor(r: {
  level: { leveledUp: boolean; after: number };
  streak: { extendedToday: boolean; current: number };
}): Celebration[] {
  const list: Celebration[] = [];
  if (r.level.leveledUp) list.push({ kind: "levelUp", level: r.level.after });
  if (r.streak.extendedToday && r.streak.current > 1) {
    list.push({ kind: "streak", days: r.streak.current });
  }
  return list;
}

/**
 * Ecrã de festa do Neto (igual à web): "Chegaste ao nível N!" e "Sequência mantida!".
 * Mostra as celebrações uma de cada vez.
 */
export function CelebrationModal({ items }: { items: Celebration[] }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const current = items[index];

  useEffect(() => {
    if (!current) return;
    sound.play(current.kind === "levelUp" ? "levelUp" : "streak");
    haptics.success();
  }, [current]);

  if (!current) return null;
  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => setIndex((i) => i + 1)}>
      <View style={styles.backdrop}>
        <View style={[styles.card, shadows.float]}>
          <Neto mood={current.kind === "levelUp" ? "celebrate" : "happy"} size={150} />
          {current.kind === "levelUp" ? (
            <>
              <AppText variant="overline" tone="accent" style={{ marginTop: space.md }}>
                {t("neto.levelUpKicker")}
              </AppText>
              <AppText variant="h1" center>
                {t("neto.levelUpTitle", { level: current.level })}
              </AppText>
              <AppText variant="small" tone="muted" center style={{ marginTop: space.xs }}>
                {t("neto.levelUpText")}
              </AppText>
            </>
          ) : (
            <>
              <AppText variant="h1" center style={{ marginTop: space.md }}>
                {t("neto.streakKept")}
              </AppText>
              <AppText variant="h3" tone="danger" center>
                🔥 {t("neto.streakDays", { count: current.days })}
              </AppText>
            </>
          )}
          <AppButton onPress={() => setIndex((i) => i + 1)} style={{ marginTop: space.xl }}>
            {t("common.continue")}
          </AppButton>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(16,31,19,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: space.xl,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 32,
    padding: space.xxl,
  },
});
