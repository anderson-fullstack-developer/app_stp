import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { AppText } from "./Text";
import { colors, type GradientName, gradients, radius, shadows, space } from "./tokens";

/** Cartão padrão: superfície clara, borda fina e sombra suave. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, shadows.card, style]}>{children}</View>;
}

/** Cartão colorido com gradiente (unidades, resultado, destaques). */
export function GradientCard({
  gradient = "forest",
  children,
  style,
}: {
  gradient?: GradientName;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <LinearGradient
      colors={gradients[gradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, shadows.raised, style]}
    >
      {/* Brilho subtil no canto (como o pattern-leaf da web). */}
      <View style={styles.glow} />
      {children}
    </LinearGradient>
  );
}

/** Barra de progresso arredondada. */
export function ProgressBar({
  value,
  tone = "primary",
  height = 12,
}: {
  /** 0–100 */
  value: number;
  tone?: "primary" | "light" | "sun";
  height?: number;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const track = tone === "light" ? "rgba(255,255,255,0.22)" : colors.muted;
  const fill =
    tone === "light" ? colors.primaryForeground : tone === "sun" ? colors.accent : colors.primary;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={[styles.track, { height, backgroundColor: track, borderRadius: height }]}
    >
      <View style={{ width: `${pct}%`, height, backgroundColor: fill, borderRadius: height }} />
    </View>
  );
}

/** Pílula de estatística (sequência, XP, moedas) com ícone. */
export function StatPill({
  icon,
  value,
  tone,
}: {
  icon: ReactNode;
  value: string | number;
  tone: "streak" | "xp" | "coins";
}) {
  const bg = { streak: colors.destructiveSoft, xp: "#fff2c7", coins: colors.muted }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon}
      <AppText variant="bodyStrong">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  gradient: { borderRadius: radius.xl, padding: space.xl, overflow: "hidden" },
  glow: {
    pointerEvents: "none",
    position: "absolute",
    top: -60,
    right: -50,
    width: 170,
    height: 170,
    borderRadius: 170,
    backgroundColor: "rgba(253,202,58,0.22)",
  },
  track: { width: "100%", overflow: "hidden" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    flex: 1,
  },
});
