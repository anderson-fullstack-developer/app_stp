import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppButton } from "./Button";
import { Neto, type NetoMood } from "./Neto";
import { AppText } from "./Text";
import { colors, radius, space } from "./tokens";

/** Esqueleto a pulsar enquanto os dados carregam. */
export function LoadingState({ rows = 3 }: { rows?: number }) {
  // Valor animado criado uma vez (useState, não useRef: o React Compiler não deixa ler refs no render).
  const [pulse] = useState(() => new Animated.Value(0.55));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.55, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View accessibilityLabel="A carregar" style={{ gap: space.md, padding: space.lg }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Animated.View key={i} style={[styles.skeleton, { opacity: pulse }]} />
      ))}
    </View>
  );
}

function StateShell({
  mood,
  title,
  text,
  action,
}: {
  mood: NetoMood;
  title: string;
  text?: string | undefined;
  action?: { label: string; onPress: () => void } | undefined;
}) {
  return (
    <View style={styles.shell} accessibilityRole={mood === "sad" ? "alert" : "summary"}>
      <Neto mood={mood} size={112} />
      <AppText variant="h3" center style={{ marginTop: space.lg }}>
        {title}
      </AppText>
      {text ? (
        <AppText variant="small" tone="muted" center style={{ marginTop: space.xs, maxWidth: 300 }}>
          {text}
        </AppText>
      ) : null}
      {action ? (
        <AppButton variant="secondary" size="md" onPress={action.onPress} style={styles.action}>
          {action.label}
        </AppButton>
      ) : null}
    </View>
  );
}

/** Vazio: o Neto contente. */
export function EmptyState({ title, text }: { title: string; text?: string }) {
  return <StateShell mood="happy" title={title} text={text} />;
}

/** Erro: o Neto triste, com "Tentar de novo". */
export function ErrorState({ text, onRetry }: { text?: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <StateShell
      mood="sad"
      title={t("neto.errorTitle")}
      text={text ?? t("neto.errorText")}
      action={onRetry ? { label: t("neto.retry"), onPress: onRetry } : undefined}
    />
  );
}

/** Sem internet: o Neto preocupado. */
export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <StateShell
      mood="worried"
      title={t("neto.offlineTitle")}
      text={t("neto.offlineText")}
      action={onRetry ? { label: t("neto.retry"), onPress: onRetry } : undefined}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: { height: 84, borderRadius: radius.xl, backgroundColor: colors.muted },
  shell: { alignItems: "center", paddingHorizontal: space.xxl, paddingVertical: space.xxxl },
  action: { marginTop: space.xl, alignSelf: "center", minWidth: 200 },
});
