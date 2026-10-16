import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { APP_NAME, VOICE_CONFIG } from "@stp/config";
import { Mic, Play, RotateCcw, Send, SkipForward, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNow } from "@/components/play/arena-hooks";
import { AppButton } from "@/components/app/Buttons";
import { LoadingState } from "@/components/app/Primitives";
import { VoiceGate } from "@/components/voice/VoiceGate";
import { VoicePage } from "@/components/voice/VoicePage";
import { VoiceStats } from "@/components/voice/VoiceStats";
import { blobToBase64, type RecordingIssue, useRecorder } from "@/hooks/use-recorder";
import { voiceError } from "@/hooks/use-voice";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { voiceApi, voiceKeys } from "@/services/voice-api.service";

export const Route = createFileRoute("/voice/record")({
  head: () => ({
    meta: [{ title: `Gravar palavras — ${APP_NAME}` }, { name: "robots", content: "noindex" }],
  }),
  component: RecordPage,
});

/** Estes impedem o envio (o servidor recusaria ou a gravação não serve). */
const BLOCKING: RecordingIssue[] = ["too_short", "too_long", "silent"];

function RecordPage() {
  const { t } = useTranslation();
  return (
    <VoicePage title={t("voice.recordCard")}>
      <VoiceGate>
        {(me) =>
          me.speakerLanguages[0] ? (
            <>
              <VoiceStats kind="speaker" />
              <Recorder languageId={me.speakerLanguages[0].id} storage={me.storageEnabled} />
            </>
          ) : (
            <p className="text-center font-semibold">{t("voice.notInvited")}</p>
          )
        }
      </VoiceGate>
    </VoicePage>
  );
}

function Recorder({ languageId, storage }: { languageId: string; storage: boolean }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en" : "pt";
  const qc = useQueryClient();
  const words = useQuery({
    queryKey: voiceKeys.words(languageId, locale),
    queryFn: () => voiceApi.words(languageId, locale),
  });
  const [gone, setGone] = useState<string[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const rec = useRecorder();
  const now = useNow();
  const queue = (words.data ?? []).filter((w) => !gone.includes(w.vocabularyId));
  const word = queue[0];

  // Lista acabou (enviadas ou saltadas): pede mais ao servidor.
  useEffect(() => {
    if (words.data && words.data.length > 0 && queue.length === 0 && !words.isFetching) {
      setGone([]);
      void words.refetch();
    }
  }, [queue.length, words.data, words.isFetching]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = (id: string) => {
    setGone((g) => [...g, id]);
    rec.clear();
  };

  const send = useMutation({
    mutationFn: async () => {
      const take = rec.take!;
      return voiceApi.record({
        vocabularyId: word!.vocabularyId,
        mimeType: take.mimeType,
        durationMs: take.durationMs,
        data: await blobToBase64(take.blob),
      });
    },
    onSuccess: () => {
      sound.play("correct");
      setFlash(t("voice.sent"));
      next(word!.vocabularyId);
      void qc.invalidateQueries({ queryKey: voiceKeys.me });
    },
  });
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 1500);
    return () => clearTimeout(id);
  }, [flash]);

  const take = rec.take;
  const blocked = !take || take.issues.some((i) => BLOCKING.includes(i));
  const recording = rec.status === "recording";
  const toggle = () => (recording ? rec.stop() : void rec.start());

  // Atalhos de teclado (para quem grava muitas palavras no computador).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest("input, textarea, select")) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (word && !send.isPending) toggle();
      } else if (e.key === "Enter" && !blocked && !send.isPending && word) {
        e.preventDefault();
        send.mutate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!storage)
    return (
      <p className="rounded-2xl bg-accent/20 px-4 py-3 text-sm font-semibold">
        {t("voice.storageOff")}
      </p>
    );
  if (words.isPending) return <LoadingState />;
  if (!word) {
    return words.isFetching ? (
      <LoadingState />
    ) : (
      <p className="card rounded-2xl p-6 text-center font-semibold">{t("voice.noWords")}</p>
    );
  }

  const elapsed = rec.startedAt ? Math.min(VOICE_CONFIG.recording.maxMs, now - rec.startedAt) : 0;

  return (
    <>
      <div className="card rounded-[1.75rem] p-6 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("voice.word")}
        </p>
        <p className="mt-1 break-words font-display text-4xl font-bold">{word.word}</p>
        {word.gloss && (
          <p className="mt-2 text-muted-foreground">
            {t("voice.meaning")}:{" "}
            <span className="font-semibold text-foreground">{word.gloss}</span>
          </p>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 py-2">
        <button
          type="button"
          onClick={toggle}
          disabled={send.isPending || rec.status === "starting"}
          aria-label={recording ? t("voice.tapToStop") : t("voice.tapToRecord")}
          className={cn(
            "pressable grid size-24 place-items-center rounded-full text-primary-foreground shadow-raised transition",
            recording ? "animate-pulse bg-destructive" : "bg-primary",
          )}
        >
          {recording ? <Square className="size-9 fill-current" /> : <Mic className="size-10" />}
        </button>
        <p className="text-sm font-semibold text-muted-foreground">
          {recording ? t("voice.tapToStop") : t("voice.tapToRecord")}
        </p>
        {recording && (
          <div className="h-1.5 w-48 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-destructive transition-[width]"
              style={{ width: `${(elapsed / VOICE_CONFIG.recording.maxMs) * 100}%` }}
            />
          </div>
        )}
        {rec.status === "denied" && (
          <p className="text-center text-sm font-bold text-destructive">{t("voice.micDenied")}</p>
        )}
        {rec.status === "unsupported" && (
          <p className="text-center text-sm font-bold text-destructive">
            {t("voice.micUnsupported")}
          </p>
        )}
      </div>

      {take && !recording && (
        <div className="animate-rise space-y-3">
          {take.issues.map((i) => (
            <p
              key={i}
              className={cn(
                "rounded-xl px-3 py-2 text-center text-sm font-semibold",
                BLOCKING.includes(i) ? "bg-destructive/10 text-destructive" : "bg-accent/20",
              )}
            >
              {t(`voice.issues.${i}`)}
            </p>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <AppButton variant="secondary" onClick={rec.play}>
              <Play className="size-4" />
              {t("voice.listenBack")}
            </AppButton>
            <AppButton variant="ghost" onClick={() => void rec.start()}>
              <RotateCcw className="size-4" />
              {t("voice.redo")}
            </AppButton>
          </div>
          <AppButton disabled={blocked || send.isPending} onClick={() => send.mutate()}>
            <Send className="size-5" />
            {send.isPending ? t("voice.sending") : t("voice.send")}
          </AppButton>
        </div>
      )}

      {send.isError && (
        <p className="text-center text-sm font-bold text-destructive">
          {voiceError(t, send.error)}
        </p>
      )}
      {flash && <p className="animate-rise text-center font-bold text-success">{flash}</p>}

      <div className="mt-auto space-y-2 pt-4 text-center">
        <button
          type="button"
          onClick={() => next(word.vocabularyId)}
          className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground underline-offset-2 hover:underline"
        >
          <SkipForward className="size-4" />
          {t("voice.skip")}
        </button>
        <p className="hidden text-xs text-muted-foreground sm:block">{t("voice.shortcuts")}</p>
        <Link to="/voice/mine" className="block text-sm font-bold text-primary">
          {t("voice.mine.open")}
        </Link>
      </div>
    </>
  );
}
