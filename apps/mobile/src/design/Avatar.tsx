import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";
import { AppText } from "./Text";
import { colors, type GradientName, gradients } from "./tokens";

const textOn: Record<GradientName, string> = {
  forest: colors.primaryForeground,
  sun: colors.accentForeground,
  ocean: "#ffffff",
  cocoa: colors.primaryForeground,
  coral: "#ffffff",
};

/** Cor vinda do servidor (texto livre) → cor conhecida do design. */
export const avatarGradient = (c: string | null): GradientName =>
  c && c in gradients ? (c as GradientName) : "ocean";

/** Avatar redondo com a inicial (igual à web). */
export function Avatar({
  name,
  color,
  size = 44,
}: {
  name: string;
  color: string | null;
  size?: number;
}) {
  const g = avatarGradient(color);
  return (
    <LinearGradient
      colors={gradients[g]}
      accessibilityLabel={name}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <AppText
        variant="h3"
        style={{ color: textOn[g], fontSize: size * 0.42, lineHeight: size * 0.5 }}
      >
        {name.charAt(0).toUpperCase()}
      </AppText>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
