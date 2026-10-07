import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Coins,
  ExternalLink,
  Flag,
  FlaskConical,
  Flame,
  RotateCcw,
  Star,
  Volume2,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useBlockAds } from "@/config/ads";
import { BackButton } from "@/components/app/BackButton";
import { AppButton } from "@/components/app/Buttons";
import { Neto } from "@/components/app/Neto";
import { BottomSheet, ProgressBar } from "@/components/app/Primitives";
import { QuizOption } from "@/components/exercises/Exercises";
import { playPronunciation, useMeaningLocale } from "@/hooks/use-kriolu";
import { serverLessonKeys } from "@/hooks/use-server-lessons";
import { PhoneFrame } from "@/layouts/AppShell";
import { KRIOLU_LANGUAGE_ID } from "@/lib/kriolu-course";
import { sound } from "@/lib/sound";
import { ApiError } from "@/services/http";
import { type AnswerResult, type LessonResult, lessonsApi } from "@/services/lessons-api.service";

/** Classe gramatical do servidor → chave de tradução (pos.*). */
const POS_KEY = {
  NOUN: "substantivo",
  VERB: "verbo",
  ADJECTIVE: "adjetivo",
  ADVERB: "advérbio",
  NUMERAL: "numeral",
} as const;
type ThemeKey =
  "numbers" | "time" | "family" | "body" | "food" | "nature" | "home" | "describe" | "verbs";

/**
 * Lição de Kriolu jogada contra o servidor (passo 2): perguntas geradas pelo servidor,
 * cada resposta corrigida lá, erradas voltam no fim, e a conclusão paga XP/moedas/streak.
 * O cliente nunca sabe a resposta certa antes de responder.
 */
export function ServerKrioluLesson({ lessonId }: { lessonId: string }) {
  useBlockAds("lesson");
  const { t } = useTranslation();
  const locale = useMeaningLocale();
  const qc = useQueryClient();
  const [run, setRun] = useState(0);

  const course = useQuery({
    queryKey: serverLessonKeys.course(KRIOLU_LANGUAGE_ID, locale),
    queryFn: () => lessonsApi.course(KRIOLU_LANGUAGE_ID, locale),
    staleTime: 5 * 60_000,
  });
  const unit = course.data?.units.find((u) => u.lessons.some((l) => l.id === lessonId));
  const lessonMeta = unit?.lessons.find((l) => l.id === lessonId);
  const themeName = unit?.slug ? t(`kriolu.themes.${unit.slug as ThemeKey}`) : "";

  // Começar uma tentativa = um pedido por lição/idioma/repetição (nunca repetido sozinho).
  const attempt = useQuery({
    queryKey: ["lesson-attempt", lessonId, locale, run],
    queryFn: () => lessonsApi.start(lessonId, locale),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const [queue, setQueue] = useState<number[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<AnswerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LessonResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [reported, setReported] = useState<string | null>(null);

  const data = attempt.data;
  useEffect(() => {
    if (!data) return;
    setQueue(data.questions.map((_, k) => k));
    setSelected(null);
    setFeedback(null);
    setResult(null);
    setFailure(null);
  }, [data]);

  if (attempt.isPending || (data && queue.length === 0 && !result && !busy)) {
    return (
      <Centered>
        <Neto mood="happy" size={120} className="animate-float" />
        <p className="mt-3 font-semibold text-muted-foreground">{t("kriolu.starting")}</p>
      </Centered>
    );
  }
  if (attempt.isError || !data) {
    const locked = attempt.error instanceof ApiError && attempt.error.status === 403;
    return (
      <Centered>
        <Neto mood={locked ? "worried" : "sad"} size={120} />
        <p className="mt-3 max-w-xs text-center font-display text-lg font-bold">
          {locked ? t("kriolu.locked") : t("kriolu.startError")}
        </p>
        <Link to="/learn" className="mt-6 w-full max-w-xs">
          <AppButton>{t("common.continue")}</AppButton>
        </Link>
      </Centered>
    );
  }

  if (result) {
    const xpLine = (
      <span className="inline-flex items-center gap-1.5 rounded-2xl bg-sun px-4 py-2 font-display text-xl font-bold text-accent-foreground">
        <Star className="size-5 fill-current" /> +{result.xp} XP
      </span>
    );
    return (
      <PhoneFrame className="bg-forest pattern-leaf">
        <div className="flex flex-1 flex-col items-center px-6 pt-12 text-center text-primary-foreground">
          <Neto
            mood={result.flagged ? "worried" : "celebrate"}
            size={150}
            className="animate-pop"
          />
          <h1 className="mt-4 font-display text-3xl font-bold">{t("kriolu.lessonDone")}</h1>
          <p className="mt-1 text-primary-foreground/80">
            {themeName} · {t("kriolu.lesson", { n: lessonMeta?.order ?? 1 })}
          </p>
          {result.flagged ? (
            <p className="mt-5 max-w-xs font-semibold">{t("kriolu.flagged")}</p>
          ) : (
            <>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {xpLine}
                {result.coins > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-2xl bg-primary-foreground px-4 py-2 font-display text-xl font-bold text-secondary">
                    <Coins className="size-5" /> {t("kriolu.coinsGained", { count: result.coins })}
                  </span>
                )}
              </div>
              <p className="mt-4 font-semibold">
                {t("kriolu.firstTry", { hits: result.correctFirstTry, total: result.total })}
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 font-display text-lg font-bold">
                <Flame className="size-5 fill-current" />
                {t("neto.streakDays", { count: result.streak.current })}
              </p>
              {result.level.leveledUp && (
                <p className="mt-2 font-display text-lg font-bold text-accent">
                  {t("kriolu.levelUp", { level: result.level.after })}
                </p>
              )}
              {result.achievements.length > 0 && (
                <p className="mt-1 text-sm font-semibold">🏅 {t("kriolu.achievement")}</p>
              )}
              <p className="mt-4 text-xs text-primary-foreground/75">✓ {t("kriolu.saved")}</p>
            </>
          )}
          <div className="mt-auto w-full space-y-3 pb-6 pt-8">
            <Link to="/learn">
              <AppButton variant="light">{t("common.continue")}</AppButton>
            </Link>
            <AppButton
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setRun((r) => r + 1)}
            >
              <RotateCcw className="size-4" />
              {t("result.repeat")}
            </AppButton>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  const total = data.questions.length;
  const head = queue[0];
  const q = head === undefined ? undefined : data.questions[head];
  if (!q) {
    return (
      <Centered>
        <Neto mood="happy" size={120} className="animate-float" />
        <p className="mt-3 font-semibold text-muted-foreground">{t("kriolu.saving")}</p>
      </Centered>
    );
  }
  const solved = total - queue.length + (feedback?.correct ? 1 : 0);
  const letters = ["A", "B", "C", "D"];
  const optionState = (id: string) =>
    !feedback
      ? "idle"
      : id === feedback.correctOptionId
        ? "correct"
        : id === selected
          ? "wrong"
          : "idle";
  const posKey = POS_KEY[q.partOfSpeech as keyof typeof POS_KEY];
  const hint = [
    posKey ? t(`pos.${posKey}`) : null,
    data.locale === "pt" ? t("preview.meaningLang") : t("preview.meaningLangEn"),
  ]
    .filter(Boolean)
    .join(" · ");

  const check = async () => {
    if (!selected) return;
    setBusy(true);
    setFailure(null);
    try {
      const fb = await lessonsApi.answer(data.attemptId, q.exerciseId, selected);
      setFeedback(fb);
      sound.play(fb.correct ? "correct" : "wrong");
    } catch {
      setFailure(t("neto.errorText"));
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    if (!feedback || head === undefined) return;
    const rest = queue.slice(1);
    // Errada: volta para o fim da fila até ser acertada.
    const nextQueue = feedback.correct ? rest : [...rest, head];
    setSelected(null);
    setFeedback(null);
    if (nextQueue.length > 0) {
      setQueue(nextQueue);
      return;
    }
    setQueue([]);
    setBusy(true);
    try {
      const res = await lessonsApi.complete(data.attemptId);
      setResult(res);
      sound.play(res.level.leveledUp ? "levelUp" : "complete");
      void qc.invalidateQueries({ queryKey: ["account"] });
      void qc.invalidateQueries({ queryKey: serverLessonKeys.progress(KRIOLU_LANGUAGE_ID) });
    } catch {
      setFailure(t("neto.errorText"));
      setQueue([head]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PhoneFrame>
      <div className="flex items-center gap-3 px-4 pt-3">
        <BackButton close />
        <ProgressBar value={(solved / total) * 100} />
      </div>

      <div className="mx-4 mt-3 flex items-start gap-2 rounded-2xl border border-accent/50 bg-accent/15 px-3 py-2 text-[12px] leading-snug text-accent-foreground">
        <FlaskConical className="mt-0.5 size-4 shrink-0" />
        <span>{t("kriolu.betaNotice")}</span>
      </div>

      <div className="px-5 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("kriolu.questionOf", {
            theme: themeName,
            n: Math.min(total - queue.length + 1, total),
            total,
          })}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold">
          <Trans
            i18nKey={q.mode === "meaning" ? "preview.whatMeans" : "preview.howToSay"}
            values={{ word: q.prompt }}
            components={{ hl: <span className="text-primary" /> }}
          />
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>

      <div
        key={`${q.exerciseId}-${queue.length}`}
        className="animate-rise flex-1 space-y-3 px-5 pb-48 pt-5"
      >
        {q.options.map((o, k) => (
          <QuizOption
            key={o.id}
            label={o.label}
            letter={letters[k]!}
            selected={selected === o.id}
            state={optionState(o.id)}
            onClick={() => !feedback && !busy && setSelected(o.id)}
          />
        ))}
        {failure && <p className="text-center text-sm font-semibold text-destructive">{failure}</p>}
      </div>

      {!feedback && (
        <div className="absolute inset-x-0 bottom-0 border-t border-border/70 bg-background px-5 pb-5 pt-4">
          <AppButton disabled={!selected || busy} onClick={() => void check()}>
            {t("lesson.check")}
          </AppButton>
        </div>
      )}

      <BottomSheet open={Boolean(feedback)} tone={feedback?.correct ? "success" : "error"}>
        {feedback && (
          <>
            <div className="flex items-start gap-3">
              <Neto
                mood={feedback.correct ? "happy" : "sad"}
                size={64}
                className="-my-1 animate-pop"
              />
              <div className="flex-1">
                <p
                  className={`font-display text-2xl font-bold ${feedback.correct ? "text-success" : "text-destructive"}`}
                >
                  {feedback.correct ? t("lesson.good") : t("lesson.almost")}
                </p>
                {!feedback.correct && (
                  <>
                    <p className="text-sm font-semibold text-destructive">
                      {t("preview.answer")}{" "}
                      <span className="font-bold">{feedback.correctLabel}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{t("kriolu.retryLater")}</p>
                  </>
                )}
                {feedback.audio && (
                  <ListenRow
                    label={`${t("kriolu.listen")} · «${feedback.word ?? ""}»`}
                    credit={
                      feedback.audio.speaker
                        ? t("kriolu.voice", { name: feedback.audio.speaker })
                        : null
                    }
                    onPlay={() => playPronunciation(feedback.audio!)}
                  />
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-muted-foreground">
                  {feedback.sourceUrl && (
                    <a
                      href={feedback.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 underline"
                    >
                      {t("preview.source")} <ExternalLink className="size-3" />
                    </a>
                  )}
                  {reported === q.exerciseId ? (
                    <span className="text-success">{t("kriolu.reported")}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setReported(q.exerciseId)}
                      className="inline-flex items-center gap-1 underline"
                    >
                      <Flag className="size-3" />
                      {t("kriolu.report")}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <AppButton
              className="mt-4"
              variant={feedback.correct ? "primary" : "danger"}
              disabled={busy}
              onClick={() => void next()}
            >
              {t("common.continue")}
            </AppButton>
          </>
        )}
      </BottomSheet>
    </PhoneFrame>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col items-center justify-center px-6">{children}</div>
    </PhoneFrame>
  );
}

function ListenRow({
  label,
  credit,
  onPlay,
}: {
  label: string;
  credit: string | null;
  onPlay: () => void;
}) {
  return (
    <div className="mt-3 flex items-center gap-3">
      <button
        type="button"
        onClick={onPlay}
        className="pressable inline-flex items-center gap-2 rounded-full bg-ocean px-3.5 py-2 text-sm font-semibold text-ocean-foreground shadow-card"
      >
        <Volume2 className="size-4" />
        {label}
      </button>
      {credit && <span className="text-[11px] text-muted-foreground">{credit}</span>}
    </div>
  );
}
