import { Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "@/hooks/use-settings";
import { questionSpeech, speech } from "@/lib/speech";
import { cn } from "@/lib/utils";

/**
 * Botão 🔊 para ouvir a pergunta (só texto na língua da interface). Com `autoKey`, lê
 * sozinho sempre que essa chave muda (nova pergunta) e cala-se ao sair do ecrã.
 */
export function SpeakButton({
  text,
  autoKey,
  className,
}: {
  text: string;
  autoKey?: string | undefined;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const { voice, sound } = useSettings();
  // Só no navegador (no servidor não há voz): evita diferenças na hidratação.
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(speech.supported()), []);
  useEffect(() => {
    if (!autoKey) return;
    // Pequena pausa: deixa o som de transição tocar primeiro.
    const id = setTimeout(() => speech.speak(text, i18n.language), 300);
    return () => clearTimeout(id);
  }, [autoKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => speech.stop(), []);

  if (!ok || !voice || !sound) return null;
  return (
    <button
      type="button"
      onClick={() => speech.speak(text, i18n.language)}
      aria-label={t("preview.listen")}
      title={t("preview.listen")}
      className={cn(
        "pressable grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary",
        className,
      )}
    >
      <Volume2 className="size-5" />
    </button>
  );
}

/** Pergunta da Arena: lê-a sozinha quando chega uma nova e mostra um 🔊 pequeno. */
export function QuestionSpeakButton({
  q,
}: {
  q: { questionId: string; mode: "meaning" | "word"; prompt: string };
}) {
  const { t } = useTranslation();
  return (
    <SpeakButton
      text={questionSpeech(t, q)}
      autoKey={q.questionId}
      className="ml-2 inline-grid size-8 rounded-xl align-middle"
    />
  );
}
