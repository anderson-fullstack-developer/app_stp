import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { AvatarColor } from "@stp/types";
import { CheckCircle2, Coins, Flame, Star, Users, Volume2, Zap } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useBlockAds } from "@/config/ads";
import { Avatar } from "@/components/app/Badges";
import { BackButton } from "@/components/app/BackButton";
import { AppButton } from "@/components/app/Buttons";
import { Neto } from "@/components/app/Neto";
import { BottomSheet, LoadingState, ProgressBar, SectionTitle } from "@/components/app/Primitives";
import { QuizOption } from "@/components/exercises/Exercises";
import { dailyKeys, useDailyLanguage } from "@/hooks/use-daily";
import { playPronunciation, useMeaningLocale } from "@/hooks/use-kriolu";
import { AppHeader, PhoneFrame } from "@/layouts/AppShell";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { type DailyResult, dailyApi } from "@/services/daily-api.service";
import type { AnswerResult } from "@/services/lessons-api.service";

const AVATAR_COLORS: AvatarColor[] = ["forest", "sun", "ocean", "cocoa", "coral"];
const avatarColor = (c: string | null): AvatarColor =>
  AVATAR_COLORS.includes(c as AvatarColor) ? (c as AvatarColor) : "ocean";

/** Ecrã do desafio do dia com dados do servidor: recompensas, o meu estado e o ranking. */
export function ServerDailyOverview() {
  const { t } = useTranslation();
  const lang = useDailyLanguage();
  const overview = useQuery({
    queryKey: dailyKeys.overview(lang),
    queryFn: () => dailyApi.overview(lang),
    retry: false,
  });
  const ranking = useQuery({
    queryKey: dailyKeys.ranking(lang),
    queryFn: () => dailyApi.ranking(lang),
    enabled: overview.isSuccess,
  });
  const o = overview.data;
  const done = o?.me?.status === "COMPLETED";

  return (
    <PhoneFrame>
      <AppHeader left={<BackButton />} title={t("daily.title")} />
      <main className="flex-1 px-4 pb-8">
        {overview.isPending ? (
          <LoadingState />
        ) : !o ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <Neto mood="worried" size={112} />
            <p className="mt-4 font-display text-lg font-bold">{t("daily.notAvailable")}</p>
          </div>
        ) : (
          <div className="animate-rise overflow-hidden rounded-[2rem] bg-sun p-6 text-accent-foreground">
            <div className="flex items-start justify-between">
              <div className="grid size-16 place-items-center rounded-3xl bg-surface/50 animate-float">
                <Zap className="size-8 fill-current" />
              </div>
              <Neto mood={done ? "celebrate" : "happy"} size={72} />
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold">{t("daily.title")}</h1>
            <p className="font-semibold opacity-80">
              {t("daily.questions", { count: o.questions })} ·{" "}
              {done ? `✓ ${t("daily.doneToday")}` : t("daily.completeToday")}
            </p>
            <div className="mt-4 flex gap-2">
              <span className="rounded-xl bg-surface/60 px-3 py-1 font-bold">+{o.xpReward} XP</span>
              <span className="rounded-xl bg-surface/60 px-3 py-1 font-bold">
                {t("kriolu.coinsGained", { count: o.coinReward })}
              </span>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-sm font-semibold">
              <Users className="size-4" />
              {t("daily.participants", { count: o.participants })}
            </p>
            {done ? (
              <div className="mt-5 rounded-2xl bg-surface/70 p-4 text-center">
                <p className="flex items-center justify-center gap-2 font-display font-bold text-success">
                  <CheckCircle2 />{" "}
                  {t("daily.score", { correct: o.me!.correct, total: o.me!.total })}
                </p>
                {o.me!.rank && (
                  <p className="mt-1 text-sm font-semibold">
                    {t("daily.rank", { rank: o.me!.rank })}
                  </p>
                )}
              </div>
            ) : (
              <Link to="/daily/play" className="mt-5 block">
                <AppButton>{o.me ? t("daily.resume") : t("daily.play")}</AppButton>
              </Link>
            )}
          </div>
        )}
        <SectionTitle>{t("daily.ranking")}</SectionTitle>
        {ranking.data && ranking.data.top.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">{t("daily.noRanking")}</p>
        ) : (
          <div className="space-y-2">
            {ranking.data?.top.slice(0, 10).map((e) => (
              <div
                key={e.userId}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5",
                  e.isMe ? "bg-primary/8 ring-1 ring-primary/40" : "card",
                )}
              >
                <span className="w-6 text-center font-display font-bold text-muted-foreground">
                  {e.position}
                </span>
                <Avatar name={e.name} color={avatarColor(e.avatarColor)} size={40} />
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {e.name}
                  {e.isMe && <span className="ml-1 text-xs text-primary">({t("daily.you")})</span>}
                </span>
                <span className="text-right">
                  <span className="block font-display font-bold">
                    {e.correct}/{e.total}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {t("daily.seconds", { s: Math.round(e.durationMs / 1000) })}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </PhoneFrame>
  );
}

/** Jogar o desafio: uma resposta por pergunta, corrigida no servidor. */
export function ServerDailyPlay() {
  useBlockAds("lesson");
  const { t } = useTranslation();
  const lang = useDailyLanguage();
  const locale = useMeaningLocale();
  const qc = useQueryClient();
  const attempt = useQuery({
    queryKey: ["daily-attempt", lang, locale],
    queryFn: () => dailyApi.start(lang, locale),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const data = attempt.data;
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<AnswerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DailyResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  // Ao retomar, salta as perguntas já respondidas.
  useEffect(() => {
    if (!data) return;
    const first = data.questions.findIndex((q) => !data.answered.includes(q.exerciseId));
    setIndex(first === -1 ? data.questions.length : first);
  }, [data]);

  const finish = async (attemptId: string) => {
    setBusy(true);
    try {
      const res = await dailyApi.complete(attemptId);
      setResult(res);
      sound.play(res.level.leveledUp ? "levelUp" : "complete");
      void qc.invalidateQueries({ queryKey: ["account"] });
      void qc.invalidateQueries({ queryKey: dailyKeys.overview(lang) });
      void qc.invalidateQueries({ queryKey: dailyKeys.ranking(lang) });
    } catch {
      setFailure(t("neto.errorText"));
    } finally {
      setBusy(false);
    }
  };

  // Retomou com tudo respondido (ex.: fechou a app no fim): conclui logo.
  const allAnswered = data ? index >= data.questions.length : false;
  useEffect(() => {
    if (data && allAnswered && !result && !busy && !failure) void finish(data.attemptId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, allAnswered]);

  if (attempt.isPending) {
    return (
      <Centered>
        <Neto mood="happy" size={120} className="animate-float" />
        <p className="mt-3 font-semibold text-muted-foreground">{t("kriolu.starting")}</p>
      </Centered>
    );
  }
  if (attempt.isError || !data) {
    return (
      <Centered>
        <Neto mood="worried" size={120} />
        <p className="mt-3 max-w-xs text-center font-display text-lg font-bold">
          {t("daily.notAvailable")}
        </p>
        <Link to="/daily" className="mt-6 w-full max-w-xs">
          <AppButton>{t("common.continue")}</AppButton>
        </Link>
      </Centered>
    );
  }

  if (result) {
    return (
      <PhoneFrame className="bg-sun">
        <div className="flex flex-1 flex-col items-center px-6 pt-12 text-center text-accent-foreground">
          <Neto
            mood={result.flagged ? "worried" : "celebrate"}
            size={150}
            className="animate-pop"
          />
          <h1 className="mt-4 font-display text-3xl font-bold">{t("daily.resultTitle")}</h1>
          <p className="mt-2 font-display text-xl font-bold">
            {t("daily.score", { correct: result.correct, total: result.total })}
          </p>
          {result.rank && (
            <p className="mt-1 font-semibold">{t("daily.rank", { rank: result.rank })}</p>
          )}
          {result.flagged ? (
            <p className="mt-5 max-w-xs font-semibold">{t("kriolu.flagged")}</p>
          ) : result.rewarded ? (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-2xl bg-surface/70 px-4 py-2 font-display text-xl font-bold">
                <Star className="size-5 fill-current" /> +{result.xp} XP
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-2xl bg-surface/70 px-4 py-2 font-display text-xl font-bold">
                <Coins className="size-5" /> {t("kriolu.coinsGained", { count: result.coins })}
              </span>
            </div>
          ) : (
            <p className="mt-5 max-w-xs font-semibold">{t("daily.alreadyPaid")}</p>
          )}
          {!result.flagged && (
            <p className="mt-3 inline-flex items-center gap-1.5 font-display text-lg font-bold">
              <Flame className="size-5 fill-current" />
              {t("neto.streakDays", { count: result.streak.current })}
            </p>
          )}
          <div className="mt-auto w-full pb-6 pt-8">
            <Link to="/daily">
              <AppButton variant="light">{t("common.continue")}</AppButton>
            </Link>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  const total = data.questions.length;
  const q = data.questions[index];
  if (!q) {
    return (
      <Centered>
        <Neto mood="happy" size={120} className="animate-float" />
        <p className="mt-3 font-semibold text-muted-foreground">{failure ?? t("kriolu.saving")}</p>
      </Centered>
    );
  }
  const letters = ["A", "B", "C", "D"];
  const optionState = (id: string) =>
    !feedback
      ? "idle"
      : id === feedback.correctOptionId
        ? "correct"
        : id === selected
          ? "wrong"
          : "idle";

  const check = async () => {
    if (!selected) return;
    setBusy(true);
    setFailure(null);
    try {
      const fb = await dailyApi.answer(data.attemptId, q.exerciseId, selected);
      setFeedback(fb);
      sound.play(fb.correct ? "correct" : "wrong");
    } catch {
      setFailure(t("neto.errorText"));
    } finally {
      setBusy(false);
    }
  };
  const next = () => {
    setSelected(null);
    setFeedback(null);
    const n = index + 1;
    setIndex(n);
    if (n >= total) void finish(data.attemptId);
  };

  return (
    <PhoneFrame>
      <div className="flex items-center gap-3 px-4 pt-3">
        <BackButton close />
        <ProgressBar value={((index + (feedback ? 1 : 0)) / total) * 100} />
      </div>
      <div className="mx-4 mt-3 flex items-start gap-2 rounded-2xl border border-accent/50 bg-accent/15 px-3 py-2 text-[12px] leading-snug text-accent-foreground">
        <Zap className="mt-0.5 size-4 shrink-0" />
        <span>{t("daily.oneAnswer")}</span>
      </div>
      <div className="px-5 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("daily.title")} · {index + 1}/{total}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold">
          <Trans
            i18nKey={q.mode === "meaning" ? "preview.whatMeans" : "preview.howToSay"}
            values={{ word: q.prompt }}
            components={{ hl: <span className="text-primary" /> }}
          />
        </h1>
      </div>
      <div key={q.exerciseId} className="animate-rise flex-1 space-y-3 px-5 pb-48 pt-5">
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
                  <p className="text-sm font-semibold text-destructive">
                    {t("preview.answer")} <span className="font-bold">{feedback.correctLabel}</span>
                  </p>
                )}
                {feedback.audio && (
                  <button
                    type="button"
                    onClick={() => playPronunciation(feedback.audio!)}
                    className="pressable mt-3 inline-flex items-center gap-2 rounded-full bg-ocean px-3.5 py-2 text-sm font-semibold text-ocean-foreground shadow-card"
                  >
                    <Volume2 className="size-4" />
                    {t("kriolu.listen")} · «{feedback.word}»
                  </button>
                )}
              </div>
            </div>
            <AppButton
              className="mt-4"
              variant={feedback.correct ? "primary" : "danger"}
              disabled={busy}
              onClick={next}
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
