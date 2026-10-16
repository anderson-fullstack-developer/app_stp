/**
 * Pronúncia real (falante nativo) da palavra certa, na revelação de cada ronda da Arena
 * (igual à web): toca sozinha uma vez e fica um 🔊 para ouvir outra vez. Só aparece se a
 * palavra tiver gravação (o servidor só a envia depois de fechar a ronda).
 */
import type { ArenaRevealEvent } from "@stp/types/arena";
import { useAudioPlayer } from "expo-audio";
import { Volume2 } from "lucide-react-native";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet } from "react-native";
import { AppText, colors, isSoundEnabled, space } from "@/design";

export function RevealPronunciation({ reveal }: { reveal: ArenaRevealEvent | null | undefined }) {
  const { t } = useTranslation();
  const player = useAudioPlayer(null);
  const audio = reveal?.audio ?? null;
  const key = audio ? reveal!.questionId : null;

  const play = () => {
    if (!audio || !isSoundEnabled()) return;
    try {
      player.replace({ uri: audio.url });
      player.play();
    } catch {
      // Sem áudio disponível: segue em silêncio.
    }
  };

  useEffect(() => {
    if (!key) return;
    // Depois do som de certo/errado.
    const id = setTimeout(play, 700);
    return () => clearTimeout(id);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!audio) return null;
  return (
    <Pressable accessibilityRole="button" onPress={play} style={styles.listen}>
      <Volume2 size={16} color="#fff" />
      <AppText variant="caption" tone="inverse">
        {audio.speaker ? t("kriolu.voice", { name: audio.speaker }) : t("preview.listen")}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listen: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    backgroundColor: colors.ocean,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: space.xs,
  },
});
