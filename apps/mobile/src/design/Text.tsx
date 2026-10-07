import type { ReactNode } from "react";
import { type StyleProp, StyleSheet, Text, type TextProps, type TextStyle } from "react-native";
import { colors, fonts } from "./tokens";

const variants = StyleSheet.create({
  display: { fontFamily: fonts.displayHeavy, fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  h1: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  h2: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  h3: { fontFamily: fonts.display, fontSize: 18, lineHeight: 24, letterSpacing: -0.3 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.bodySemibold, fontSize: 12, lineHeight: 16 },
  overline: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
});

const tones = {
  default: colors.foreground,
  muted: colors.mutedForeground,
  primary: colors.primary,
  inverse: colors.primaryForeground,
  danger: colors.destructive,
  success: colors.success,
  accent: colors.accentDeep,
} as const;

export type TextVariant = keyof typeof variants;
export type TextTone = keyof typeof tones;

/** Texto da app: variantes tipográficas e tons fixos (nunca cores soltas nos ecrãs). */
export function AppText({
  variant = "body",
  tone = "default",
  center,
  style,
  children,
  ...rest
}: TextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
}) {
  return (
    <Text
      {...rest}
      style={[variants[variant], { color: tones[tone] }, center && { textAlign: "center" }, style]}
    >
      {children}
    </Text>
  );
}
