import { Check, X } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText, colors, haptics, radius, shadows, space } from "@/design";

export type OptionState = "idle" | "correct" | "wrong";

/** Opção de resposta (igual à web): letra à esquerda; verde se certa, vermelha se errada. */
export function QuizOption({
  label,
  letter,
  selected,
  state,
  onPress,
}: {
  label: string;
  letter: string;
  selected: boolean;
  state: OptionState;
  onPress: () => void;
}) {
  const correct = state === "correct";
  const wrong = state === "wrong";
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={({ pressed }) => [
        styles.option,
        shadows.card,
        selected && !correct && !wrong && styles.selected,
        correct && styles.correct,
        wrong && styles.wrong,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <View
        style={[
          styles.letter,
          selected && !correct && !wrong && styles.letterSelected,
          correct && styles.letterCorrect,
          wrong && styles.letterWrong,
        ]}
      >
        {correct ? (
          <Check size={18} color={colors.success} strokeWidth={3} />
        ) : wrong ? (
          <X size={18} color={colors.destructive} strokeWidth={3} />
        ) : (
          <AppText variant="caption" tone={selected ? "primary" : "muted"}>
            {letter}
          </AppText>
        )}
      </View>
      <AppText variant="bodyStrong" style={{ flex: 1 }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 64,
    paddingHorizontal: space.lg,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  correct: { borderColor: colors.success, backgroundColor: colors.successSoft },
  wrong: { borderColor: colors.destructive, backgroundColor: colors.destructiveSoft },
  letter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  letterSelected: { borderColor: colors.primary },
  letterCorrect: { borderColor: colors.success },
  letterWrong: { borderColor: colors.destructive },
});
