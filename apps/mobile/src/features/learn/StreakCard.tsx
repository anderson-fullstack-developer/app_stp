import { Check, Flame, Trophy } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText, Card, colors, Neto, space } from "@/design";

const DAYS_PT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const DAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Sequência da semana (igual à web): chama se já praticou hoje, Neto preocupado se não. */
export function StreakCard({
  streak,
  longest,
  week,
  todayIndex,
}: {
  streak: number;
  longest: number;
  week: boolean[];
  todayIndex: number;
}) {
  const { t, i18n } = useTranslation();
  const days = i18n.language === "en" ? DAYS_EN : DAYS_PT;
  const todayDone = Boolean(week[todayIndex]);
  return (
    <Card style={[styles.card, !todayDone && styles.risk]}>
      <View style={styles.row}>
        {todayDone ? (
          <View style={styles.flame}>
            <Flame size={28} color="#fff" fill="#fff" />
          </View>
        ) : (
          <Neto mood="worried" size={56} />
        )}
        <View style={{ flex: 1 }}>
          <AppText variant="h3">{t("neto.streakDays", { count: streak })}</AppText>
          <AppText variant="caption" tone={todayDone ? "muted" : "accent"}>
            {todayDone
              ? t("neto.streakDone")
              : streak > 0
                ? `${t("neto.streakRiskTitle")} ${t("neto.streakRiskText")}`
                : t("neto.streakStartText")}
          </AppText>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <View style={styles.recordRow}>
            <Trophy size={13} color={colors.mutedForeground} />
            <AppText variant="caption" tone="muted">
              {t("neto.record")}
            </AppText>
          </View>
          <AppText variant="bodyStrong">{longest}</AppText>
        </View>
      </View>
      <View style={styles.days}>
        {days.map((d, i) => (
          <View key={d} style={styles.day}>
            <AppText variant="caption" tone={i === todayIndex ? "primary" : "muted"}>
              {d}
            </AppText>
            <View
              style={[
                styles.dot,
                week[i] ? styles.dotDone : i === todayIndex ? styles.dotToday : styles.dotEmpty,
              ]}
            >
              {week[i] ? <Check size={16} color="#fff" strokeWidth={3} /> : null}
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24 },
  risk: { borderWidth: 2, borderColor: "rgba(244,164,55,0.5)" },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  flame: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.destructive,
    alignItems: "center",
    justifyContent: "center",
  },
  recordRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  days: { flexDirection: "row", justifyContent: "space-between", marginTop: space.lg },
  day: { alignItems: "center", gap: 4 },
  dot: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  dotDone: { backgroundColor: colors.destructive },
  dotToday: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.primary,
    backgroundColor: "rgba(0,119,72,0.05)",
  },
  dotEmpty: { backgroundColor: colors.muted },
});
