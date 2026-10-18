import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { APP_NAME } from "@stp/config";
import type { VoiceRejectReason } from "@stp/types/api";
import { Check, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/app/Buttons";
import { LoadingState } from "@/components/app/Primitives";
import { TaskHeader } from "@/components/voice/TaskHeader";
import { VoiceGate } from "@/components/voice/VoiceGate";
import { VoicePage } from "@/components/voice/VoicePage";
import { VoiceStats } from "@/components/voice/VoiceStats";
import { voiceError } from "@/hooks/use-voice";
import { cn } from "@/lib/utils";
import { voiceApi, voiceKeys } from "@/services/voice-api.service";

export const Route = createFileRoute("/voice/listen")({
  head: () => ({
    meta: [{ title: `Ouvir gravações — ${APP_NAME}` }, { name: "robots", content: "noindex" }],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    task: typeof s["task"] === "string" ? s["task"] : "",
  }),
  component: ListenPage,
});

const REASONS: VoiceRejectReason[] = ["PRONUNCIATION", "NOISE", "WRONG_WORD", "CUT_OFF", "OTHER"];

function ListenPage() {
  const { t } = useTranslation();
  const { task } = Route.useSearch();
  return (
    <VoicePage title={t("voice.listenCard")}>
      <VoiceGate>
        {() =>
          task ? (
            <>
              <TaskHeader taskId={task} />
              <VoiceStats kind="listener" />
              <Listener taskId={task} />
            </>
          ) : (
            <p className="card rounded-2xl p-6 text-center font-semibold">
              {t("voice.tasks.none")}
            </p>
          )
        }
      </VoiceGate>
    </VoicePage>
  );
}

function Listener({ taskId }: { taskId: string }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en" : "pt";
  const qc = useQueryClient();
  const next = useQuery({
    queryKey: voiceKeys.next(taskId, locale),
    queryFn: () => voiceApi.next(taskId, locale),
    staleTime: Infinity,
  });
  const item = next.data?.item ?? null;
  const [rejecting, setRejecting] = useState(false);
  const player = useRef<HTMLAudioElement | null>(null);

  // Áudio da gravação (com sessão): toca sozinho quando chega.
  const audio = useQuery({
    queryKey: ["voice", "audio", item?.recordingId],
    queryFn: async () => URL.createObjectURL(await voiceApi.audio(item!.recordingId)),
    enabled: Boolean(item),
    staleTime: Infinity,
    gcTime: 0,
  });
  useEffect(() => {
    if (!audio.data) return;
    const el = new Audio(audio.data);
    player.current = el;
    void el.play().catch(() => {});
    return () => {
      el.pause();
      URL.revokeObjectURL(audio.data);
    };
  }, [audio.data]);
  const play = () => {
    if (!player.current) return;
    player.current.currentTime = 0;
    void player.current.play().catch(() => {});
  };

  const vote = useMutation({
    mutationFn: (v: { verdict: "APPROVE" | "REJECT"; reason: VoiceRejectReason | null }) =>
      voiceApi.review(item!.recordingId, taskId, v.verdict, v.reason),
    onSettled: () => {
      setRejecting(false);
      void next.refetch();
      void qc.invalidateQueries({ queryKey: voiceKeys.me });
      void qc.invalidateQueries({ queryKey: voiceKeys.tasks });
      void qc.invalidateQueries({ queryKey: voiceKeys.earnings });
    },
  });

  // Atalhos: 1 = correta, 2 = rejeitar, R = ouvir outra vez.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!item || vote.isPending) return;
      if (e.key === "1" && !rejecting) vote.mutate({ verdict: "APPROVE", reason: null });
      else if (e.key === "2") setRejecting(true);
      else if (e.key.toLowerCase() === "r") play();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (next.isPending || next.isFetching) return <LoadingState />;
  if (!item) {
    return <p className="card rounded-2xl p-6 text-center font-semibold">{t("voice.noReviews")}</p>;
  }

  return (
    <>
      <p className="text-center font-display text-lg font-bold">{t("voice.listenTitle")}</p>
      <div className="card rounded-[1.75rem] p-6 text-center">
        <p className="break-words font-display text-4xl font-bold">{item.word}</p>
        {item.gloss && (
          <p className="mt-2 text-muted-foreground">
            {t("voice.meaning")}:{" "}
            <span className="font-semibold text-foreground">{item.gloss}</span>
          </p>
        )}
        {item.region && (
          <p className="mt-2 text-xs font-bold text-muted-foreground">
            {t("voice.regionTag", { region: item.region })}
          </p>
        )}
        <AppButton
          variant="secondary"
          size="md"
          className="mx-auto mt-4"
          disabled={!audio.data}
          onClick={play}
        >
          <Play className="size-4" />
          {audio.isPending ? "…" : t("voice.playAgain")}
        </AppButton>
      </div>

      {rejecting ? (
        <div className="animate-rise space-y-2">
          <p className="text-center font-bold">{t("voice.rejectWhy")}</p>
          <div className="grid grid-cols-2 gap-2">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                disabled={vote.isPending}
                onClick={() => vote.mutate({ verdict: "REJECT", reason: r })}
                className={cn(
                  "pressable rounded-xl border-[1.5px] border-border bg-surface px-3 py-3 text-sm font-bold",
                  r === "OTHER" && "col-span-2",
                )}
              >
                {t(`voice.reasons.${r}`)}
              </button>
            ))}
          </div>
          <AppButton
            variant="ghost"
            size="md"
            className="w-full"
            onClick={() => setRejecting(false)}
          >
            {t("common.cancel")}
          </AppButton>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <AppButton
            variant="danger"
            disabled={vote.isPending || !audio.data}
            onClick={() => setRejecting(true)}
          >
            <X className="size-5" />
            {t("voice.reject")}
          </AppButton>
          <AppButton
            disabled={vote.isPending || !audio.data}
            onClick={() => vote.mutate({ verdict: "APPROVE", reason: null })}
          >
            <Check className="size-5" />
            {t("voice.approve")}
          </AppButton>
        </div>
      )}
      {vote.isError && (
        <p className="text-center text-sm font-bold text-destructive">
          {voiceError(t, vote.error)}
        </p>
      )}
    </>
  );
}
