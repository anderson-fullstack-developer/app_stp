import { useAudioPlayer } from "expo-audio";
import { Flag, Volume2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { AnswerResponse } from "@stp/types/api";
import { AppButton, AppText, colors, Neto, space } from "@/design";

/**
 * Painel que sobe depois de responder (igual à web): Neto contente ou triste, resposta
 * certa, ouvir a pronúncia da falante nativa e reportar erro.
 */
export function FeedbackSheet({
  feedback,
  note,
  busy,
  onContinue,
}: {
  feedback: AnswerResponse;
  /** Texto extra quando erra (ex.: "Vais ver esta pergunta outra vez no fim."). */
  note?: string | undefined;
  busy?: boolean;
  onContinue: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [rise] = useState(() => new Animated.Value(80));
  const [reported, setReported] = useState(false);
  const player = useAudioPlayer(null);

  useEffect(() => {
    Animated.spring(rise, {
      toValue: 0,
      useNativeDriver: true,
      damping: 16,
      stiffness: 180,
    }).start();
  }, [rise]);

  const ok = feedback.correct;
  return (
    <Animated.View
      style={[
        styles.sheet,
        { paddingBottom: space.lg + insets.bottom, transform: [{ translateY: rise }] },
        { backgroundColor: ok ? colors.successSoft : colors.destructiveSoft },
      ]}
    >
      <View style={styles.row}>
        <Neto mood={ok ? "happy" : "sad"} size={64} />
        <View style={{ flex: 1 }}>
          <AppText variant="h2" tone={ok ? "success" : "danger"}>
            {ok ? t("lesson.good") : t("lesson.almost")}
          </AppText>
          {!ok ? (
            <>
              <AppText variant="small" tone="danger" style={{ fontFamily: "Figtree_700Bold" }}>
                {t("preview.answer")} {feedback.correctLabel}
              </AppText>
              {note ? (
                <AppText variant="caption" tone="muted">
                  {note}
                </AppText>
              ) : null}
            </>
          ) : null}
          {feedback.audio ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                player.replace({ uri: feedback.audio!.url });
                player.play();
              }}
              style={styles.listen}
            >
              <Volume2 size={16} color="#fff" />
              <AppText variant="caption" tone="inverse">
                {t("kriolu.listen")} · «{feedback.word}»
              </AppText>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={reported}
            onPress={() => setReported(true)}
            style={styles.report}
          >
            {reported ? (
              <AppText variant="caption" tone="success">
                {t("kriolu.reported")}
              </AppText>
            ) : (
              <>
                <Flag size={12} color={colors.mutedForeground} />
                <AppText variant="caption" tone="muted" style={{ textDecorationLine: "underline" }}>
                  {t("kriolu.report")}
                </AppText>
              </>
            )}
          </Pressable>
        </View>
      </View>
      <AppButton
        variant={ok ? "primary" : "danger"}
        loading={busy}
        onPress={onContinue}
        style={{ marginTop: space.lg }}
      >
        {t("common.continue")}
      </AppButton>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    boxShadow: "0 -8px 30px -12px rgba(74,58,32,0.25)",
  },
  row: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  listen: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginTop: space.md,
    backgroundColor: colors.ocean,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  report: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: space.sm },
});
