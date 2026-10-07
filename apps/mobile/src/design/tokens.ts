/**
 * Tokens do design system mobile — as mesmas cores da app web (apps/admin/src/styles.css,
 * definidas em OKLCH e convertidas para hex). Mudar aqui muda a app inteira.
 */
import type { ViewStyle } from "react-native";

export const colors = {
  background: "#faf6ee",
  surface: "#fffdfa",
  foreground: "#101f13",
  muted: "#eee9df",
  mutedForeground: "#5c6759",
  border: "#e7e2d9",

  primary: "#007748",
  primaryDeep: "#00522f",
  primaryForeground: "#fdfaf3",
  primarySoft: "#d9efe3",

  secondary: "#68432f",
  accent: "#fdca3a",
  accentDeep: "#d48e00",
  accentForeground: "#3b220d",
  ocean: "#2196a7",

  success: "#25984d",
  successSoft: "#ccf4d3",
  warning: "#f4a437",
  destructive: "#da4339",
  destructiveSoft: "#ffe2dc",
} as const;

/** Gradientes das superfícies coloridas (cartões de unidade, resultado, botões). */
export const gradients = {
  forest: ["#007748", "#004b31"],
  sun: ["#fdd343", "#f28f29"],
  ocean: ["#2196a7", "#005e7d"],
  cocoa: ["#744931", "#43251a"],
  coral: ["#ec5d4b", "#b6303e"],
} as const satisfies Record<string, readonly [string, string]>;
export type GradientName = keyof typeof gradients;

export const radius = { sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

/** Fontes carregadas em app/_layout.tsx (as mesmas da web). */
export const fonts = {
  display: "BricolageGrotesque_700Bold",
  displayHeavy: "BricolageGrotesque_800ExtraBold",
  body: "Figtree_500Medium",
  bodyRegular: "Figtree_400Regular",
  bodySemibold: "Figtree_600SemiBold",
  bodyBold: "Figtree_700Bold",
} as const;

/**
 * Elevação suave em camadas (tom quente), equivalente a shadow-card / shadow-raised da web.
 * boxShadow funciona em Android, iOS e web (React Native 0.76+).
 */
export const shadows = {
  card: { boxShadow: "0 1px 2px rgba(74,58,32,0.05), 0 6px 18px -8px rgba(74,58,32,0.16)" },
  raised: { boxShadow: "0 2px 4px rgba(74,58,32,0.06), 0 12px 28px -12px rgba(74,58,32,0.26)" },
  float: { boxShadow: "0 4px 10px rgba(74,58,32,0.08), 0 22px 44px -16px rgba(74,58,32,0.32)" },
} as const satisfies Record<string, ViewStyle>;
