/**
 * Pronúncia real (falante nativo) da palavra certa, na revelação de cada ronda da Arena:
 * toca sozinha uma vez e fica um 🔊 para ouvir outra vez. Só aparece se a palavra tiver
 * gravação (o servidor só a envia depois de fechar a ronda, para não dar a resposta).
 */
import type { ArenaRevealEvent } from "@stp/types/arena";
import { Volume2 } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { settings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";

function play(url: string) {
  if (typeof window === "undefined" || !settings.get().sound) return;
  void new Audio(url).play().catch(() => {});
}

export function RevealPronunciation({
  reveal,
  className,
}: {
  reveal: ArenaRevealEvent | null | undefined;
  className?: string;
}) {
  const { t } = useTranslation();
  const audio = reveal?.audio ?? null;
  const key = audio ? reveal!.questionId : null;
  useEffect(() => {
    if (!key || !audio) return;
    // Depois do som de certo/errado.
    const id = setTimeout(() => play(audio.url), 700);
    return () => clearTimeout(id);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!audio) return null;
  return (
    <button
      type="button"
      onClick={() => play(audio.url)}
      className={cn(
        "animate-rise pressable mx-auto flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary",
        className,
      )}
    >
      <Volume2 className="size-4" />
      {audio.speaker ? t("kriolu.voice", { name: audio.speaker }) : t("preview.listen")}
    </button>
  );
}
