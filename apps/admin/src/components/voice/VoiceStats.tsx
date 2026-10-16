import { useTranslation } from "react-i18next";
import { useVoiceMe } from "@/hooks/use-voice";
import { cn } from "@/lib/utils";

/** Progresso de quem grava ou ouve (atualiza depois de cada envio/voto). */
export function VoiceStats({ kind }: { kind: "speaker" | "listener" }) {
  const { t } = useTranslation();
  const me = useVoiceMe().data;
  if (!me) return null;
  const items: [string, number, string?][] =
    kind === "speaker"
      ? [
          [t("voice.stats.today"), me.speaker.today, "text-primary"],
          [t("voice.stats.total"), me.speaker.total],
          [`✅ ${t("voice.stats.approved")}`, me.speaker.approved, "text-success"],
          [`⏳ ${t("voice.stats.pending")}`, me.speaker.pending],
          [`❌ ${t("voice.stats.rejected")}`, me.speaker.rejected, "text-destructive"],
        ]
      : [
          [t("voice.stats.today"), me.listener.today, "text-primary"],
          [`${t("voice.stats.reviewed")} · ${t("voice.stats.total")}`, me.listener.total],
        ];
  return (
    <div
      className={cn(
        "grid gap-1.5 rounded-2xl bg-muted/60 p-2 text-center",
        kind === "speaker" ? "grid-cols-5" : "grid-cols-2",
      )}
    >
      {items.map(([label, value, tone]) => (
        <div key={label} className="rounded-xl bg-surface px-1 py-1.5">
          <p className={cn("font-display text-lg font-bold tabular-nums", tone)}>{value}</p>
          <p className="truncate text-[10px] font-semibold leading-tight text-muted-foreground">
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}
