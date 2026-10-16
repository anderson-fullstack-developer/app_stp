import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { APP_NAME } from "@stp/config";
import type { VoiceMyRecordingDto } from "@stp/types/api";
import { Play } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LoadingState } from "@/components/app/Primitives";
import { VoiceGate } from "@/components/voice/VoiceGate";
import { VoicePage } from "@/components/voice/VoicePage";
import { VoiceStats } from "@/components/voice/VoiceStats";
import { cn } from "@/lib/utils";
import { voiceApi, voiceKeys } from "@/services/voice-api.service";

export const Route = createFileRoute("/voice/mine")({
  head: () => ({
    meta: [{ title: `O meu painel — ${APP_NAME}` }, { name: "robots", content: "noindex" }],
  }),
  component: MinePage,
});

type Status = VoiceMyRecordingDto["status"];
const FILTERS: (Status | "ALL")[] = ["ALL", "APPROVED", "PENDING", "REJECTED"];
const TONE: Record<Status, string> = {
  APPROVED: "bg-success-soft text-success",
  PENDING: "bg-muted text-muted-foreground",
  REJECTED: "bg-destructive/10 text-destructive",
};
const ICON: Record<Status, string> = { APPROVED: "✅", PENDING: "⏳", REJECTED: "❌" };

function MinePage() {
  const { t } = useTranslation();
  return (
    <VoicePage title={t("voice.mine.title")}>
      <VoiceGate>
        {() => (
          <>
            <VoiceStats kind="speaker" />
            <MyRecordings />
          </>
        )}
      </VoiceGate>
    </VoicePage>
  );
}

function MyRecordings() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en" : "pt";
  const [filter, setFilter] = useState<Status | "ALL">("ALL");
  const [playing, setPlaying] = useState<string | null>(null);
  const list = useQuery({
    queryKey: voiceKeys.mine(locale, filter),
    queryFn: () => voiceApi.mine(locale, filter === "ALL" ? undefined : filter),
  });

  const play = async (id: string) => {
    setPlaying(id);
    try {
      const url = URL.createObjectURL(await voiceApi.audio(id));
      const el = new Audio(url);
      el.onended = () => URL.revokeObjectURL(url);
      await el.play();
    } catch {
      // Sem áudio (ex.: guardado noutro servidor): segue em silêncio.
    } finally {
      setPlaying(null);
    }
  };

  return (
    <>
      <div className="flex gap-1 rounded-2xl bg-muted/60 p-1" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              "flex-1 rounded-xl px-2 py-2 text-xs font-bold transition",
              filter === f ? "bg-surface text-primary shadow-card" : "text-muted-foreground",
            )}
          >
            {f === "ALL" ? t("voice.mine.all") : `${ICON[f]} ${t(`voice.mine.status.${f}`)}`}
          </button>
        ))}
      </div>
      {filter === "REJECTED" && (
        <p className="rounded-xl bg-accent/20 px-3 py-2 text-xs font-semibold">
          {t("voice.mine.tipRejected")}
        </p>
      )}
      {list.isPending ? (
        <LoadingState />
      ) : !list.data?.length ? (
        <p className="card rounded-2xl p-6 text-center font-semibold">{t("voice.mine.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {list.data.map((r) => (
            <li key={r.recordingId} className="card flex items-center gap-3 rounded-2xl p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg font-bold">{r.word}</p>
                {r.gloss && <p className="truncate text-xs text-muted-foreground">{r.gloss}</p>}
                {r.status === "REJECTED" && r.rejectReasons.length > 0 && (
                  <p className="mt-0.5 text-xs font-semibold text-destructive">
                    {t("voice.mine.reasons", {
                      list: r.rejectReasons.map((x) => t(`voice.reasons.${x}`)).join(", "),
                    })}
                  </p>
                )}
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString(i18n.language, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold",
                  TONE[r.status],
                )}
              >
                {ICON[r.status]} {t(`voice.mine.status.${r.status}`)}
              </span>
              <button
                type="button"
                onClick={() => void play(r.recordingId)}
                disabled={playing === r.recordingId}
                aria-label={t("voice.mine.play")}
                className="pressable grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
              >
                <Play className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
