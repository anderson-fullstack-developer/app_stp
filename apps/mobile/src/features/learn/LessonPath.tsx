import { router } from "expo-router";
import { Check, Lock, Star } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { CourseResponse, LessonState } from "@stp/types/api";
import { AppText, colors, GradientCard, type GradientName, haptics, space } from "@/design";

const UNIT_GRADIENTS: GradientName[] = ["forest", "ocean", "cocoa", "coral", "sun"];
/** Deslocamento horizontal em onda (igual à web). */
const WAVE = [0, 44, 64, 44, 0, -44, -64, -44];

type ThemeKey =
  "numbers" | "time" | "family" | "body" | "food" | "nature" | "home" | "describe" | "verbs";

/** Caminho de lições por temas: concluídas, atual ("Começar") e bloqueadas. */
export function LessonPath({
  course,
  states,
}: {
  course: CourseResponse;
  states: Map<string, LessonState>;
}) {
  const { t } = useTranslation();
  return (
    <View>
      {course.units.map((unit, ui) => {
        const lessons = unit.lessons.filter((l) => l.playable);
        const done = lessons.filter((l) => states.get(l.id) === "completed").length;
        const allLocked = lessons.every((l) => (states.get(l.id) ?? "locked") === "locked");
        const gradient = UNIT_GRADIENTS[ui % UNIT_GRADIENTS.length]!;
        const onSun = gradient === "sun";
        return (
          <View key={unit.id} style={{ marginTop: space.xxl }}>
            <GradientCard gradient={gradient} style={allLocked ? { opacity: 0.7 } : undefined}>
              <View style={styles.unitRow}>
                <View style={{ flex: 1 }}>
                  <AppText
                    variant="overline"
                    tone={onSun ? "default" : "inverse"}
                    style={{ opacity: 0.8 }}
                  >
                    {t("kriolu.unit", { n: ui + 1 })}
                  </AppText>
                  <AppText variant="h2" tone={onSun ? "default" : "inverse"}>
                    {unit.icon} {t(`kriolu.themes.${(unit.slug ?? "") as ThemeKey}`)}
                  </AppText>
                </View>
                <View style={styles.unitChip}>
                  <AppText variant="caption" tone={onSun ? "default" : "inverse"}>
                    {t("kriolu.lessonsDone", { done, total: lessons.length })}
                  </AppText>
                </View>
              </View>
            </GradientCard>
            <View style={styles.nodes}>
              {lessons.map((lesson, li) => {
                const state = states.get(lesson.id) ?? "locked";
                const Icon = state === "completed" ? Check : state === "current" ? Star : Lock;
                const shift = WAVE[(li + ui * 3) % WAVE.length] ?? 0;
                return (
                  <Pressable
                    key={lesson.id}
                    disabled={state === "locked"}
                    accessibilityRole="button"
                    accessibilityLabel={t("kriolu.lesson", { n: lesson.order })}
                    onPress={() => {
                      haptics.tap();
                      router.push({ pathname: "/lesson/[id]", params: { id: lesson.id } });
                    }}
                    style={({ pressed }) => [
                      styles.node,
                      { transform: [{ translateX: shift }, { scale: pressed ? 0.95 : 1 }] },
                    ]}
                  >
                    {state === "current" ? (
                      <View style={styles.startBubble}>
                        <AppText variant="caption" tone="primary">
                          {t("onboarding.start")}
                        </AppText>
                      </View>
                    ) : null}
                    <View
                      style={[
                        styles.diamond,
                        state === "completed" && styles.completed,
                        state === "current" && styles.current,
                        state === "locked" && styles.locked,
                      ]}
                    >
                      <View style={{ transform: [{ rotate: "-45deg" }] }}>
                        <Icon
                          size={28}
                          strokeWidth={2.75}
                          color={
                            state === "completed"
                              ? colors.primaryForeground
                              : state === "current"
                                ? colors.accentForeground
                                : "rgba(92,103,89,0.7)"
                          }
                        />
                      </View>
                    </View>
                    <AppText
                      variant="caption"
                      tone={state === "locked" ? "muted" : "default"}
                      style={{ marginTop: 12 }}
                    >
                      {t("kriolu.lesson", { n: lesson.order })}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  unitRow: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  unitChip: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  nodes: { alignItems: "center", gap: 28, paddingVertical: space.xxxl },
  node: { alignItems: "center" },
  startBubble: {
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    boxShadow: "0 8px 16px -8px rgba(74,58,32,0.3)",
  },
  diamond: {
    width: 72,
    height: 72,
    borderRadius: 28,
    transform: [{ rotate: "45deg" }],
    alignItems: "center",
    justifyContent: "center",
  },
  completed: {
    backgroundColor: colors.primary,
    boxShadow: "0 12px 24px -10px rgba(0,119,72,0.55)",
  },
  current: {
    backgroundColor: colors.accent,
    borderWidth: 6,
    borderColor: "rgba(253,202,58,0.35)",
    boxShadow: "0 14px 28px -10px rgba(212,142,0,0.7)",
  },
  locked: { backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border },
});
