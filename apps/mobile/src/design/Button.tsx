import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { haptics } from "./haptics";
import { AppText } from "./Text";
import { colors, fonts, gradients, radius, shadows } from "./tokens";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "sun" | "light";

const look: Record<
  Variant,
  { bg?: readonly [string, string]; solid?: string; text: string; border?: string }
> = {
  primary: { bg: gradients.forest, text: colors.primaryForeground },
  danger: { bg: gradients.coral, text: "#ffffff" },
  sun: { bg: gradients.sun, text: colors.accentForeground },
  secondary: { solid: colors.surface, text: colors.foreground, border: colors.border },
  light: { solid: colors.primaryForeground, text: colors.primaryDeep },
  ghost: { solid: "transparent", text: colors.primary },
};

/**
 * Botão da app: gradiente nos principais, superfície clara nos secundários; encolhe
 * ligeiramente e vibra ao tocar. `loading` mostra um indicador e bloqueia toques duplos.
 */
export function AppButton({
  children,
  onPress,
  variant = "primary",
  size = "lg",
  disabled,
  loading,
  icon,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  variant?: Variant;
  size?: "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const v = look[variant];
  const inactive = disabled || loading;
  const height = size === "lg" ? 56 : 46;
  const content = (
    <View style={[styles.row, { height }]}>
      {loading ? <ActivityIndicator color={v.text} /> : icon}
      <AppText
        style={{ color: v.text, fontFamily: fonts.bodyBold, fontSize: size === "lg" ? 17 : 15 }}
      >
        {children}
      </AppText>
    </View>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(loading) }}
      disabled={inactive}
      onPress={() => {
        haptics.tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        v.bg && variant !== "ghost" ? shadows.raised : null,
        { transform: [{ scale: pressed ? 0.975 : 1 }], opacity: inactive ? 0.55 : 1 },
        style,
      ]}
    >
      {v.bg ? (
        <LinearGradient
          colors={v.bg}
          style={styles.fill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.fill,
            { backgroundColor: v.solid },
            v.border ? { borderWidth: 1.5, borderColor: v.border } : null,
          ]}
        >
          {content}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg, alignSelf: "stretch" },
  fill: { borderRadius: radius.lg, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
});
