import { Volume2 } from "lucide-react-native";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet } from "react-native";
import { isSoundEnabled } from "./sound";
import { isVoiceEnabled, speech } from "./speech";
import { colors, radius } from "./tokens";

/**
 * Botão 🔊 para ouvir a pergunta (só texto na língua da interface). Com `autoKey`, lê
 * sozinho sempre que essa chave muda (nova pergunta) e cala-se ao sair do ecrã.
 */
export function SpeakButton({
  text,
  autoKey,
  size = 40,
}: {
  text: string;
  autoKey?: string | undefined;
  size?: number;
}) {
  const { t, i18n } = useTranslation();
  useEffect(() => {
    if (!autoKey) return;
    // Pequena pausa: deixa o som de transição tocar primeiro.
    const id = setTimeout(() => speech.speak(text, i18n.language), 300);
    return () => clearTimeout(id);
  }, [autoKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => speech.stop(), []);

  if (!isVoiceEnabled() || !isSoundEnabled()) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("preview.listen")}
      onPress={() => speech.speak(text, i18n.language)}
      hitSlop={8}
      style={[styles.btn, { width: size, height: size }]}
    >
      <Volume2 size={size / 2} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
});
