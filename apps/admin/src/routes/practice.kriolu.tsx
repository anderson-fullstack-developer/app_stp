import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  ExternalLink,
  Flag,
  FlaskConical,
  RotateCcw,
  Volume2,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { z } from "zod";
import { APP_CONFIG, APP_NAME } from "@stp/config";
import { useBlockAds } from "@/config/ads";
import { Neto } from "@/components/app/Neto";
import { BackButton } from "@/components/app/BackButton";
import { AppButton } from "@/components/app/Buttons";
import { BottomSheet, ProgressBar } from "@/components/app/Primitives";
import { QuizOption } from "@/components/exercises/Exercises";
import { game } from "@/hooks/use-game";
import {
  krioluEntries,
  krioluProgress,
  krioluPtSuggestions,
  useKrioluCourse,
  useMeaningLocale,
  krioluAudio,
  playPronunciation,
} from "@/hooks/use-kriolu";
import { PhoneFrame } from "@/layouts/AppShell";
import { buildKrioluLessonQuiz } from "@/lib/kriolu-course";
import { sound } from "@/lib/sound";

/**
 * Lição de Kriolu (Cabo Verde) em BETA — ADR-14.
 * Conteúdo importado do Wiktionary (CC BY-SA 4.0) e ainda não revisto por falantes nativos:
 * o aviso Beta e o botão "Reportar erro" estão sempre visíveis.
 */
export const Route = createFileRoute("/practice/kriolu")({
  validateSearch: (s) => z.object({ lesson: z.string().optional().catch(undefined) }).parse(s),
  head: () => ({ meta: [{ title: `Kriolu (Beta) — ${APP_NAME}` }] }),
  component: KrioluLesson,
});

const POS_KEYS = ["substantivo", "verbo", "adjetivo", "advérbio", "numeral"] as const;
type PosKey = (typeof POS_KEYS)[number];
const isPosKey = (x: string): x is PosKey => (POS_KEYS as readonly string[]).includes(x);
const THEME_KEYS = [
  "numbers",
  "time",
  "family",
  "body",
  "food",
  "nature",
  "home",
  "describe",
  "verbs",
] as const;
type ThemeKey = (typeof THEME_KEYS)[number];
const isThemeKey = (x: string): x is ThemeKey => (THEME_KEYS as readonly string[]).includes(x);

function KrioluLesson() {
  useBlockAds("lesson");
  const { t } = useTranslation();
  const { lesson: lessonId } = Route.useSearch();
  const locale = useMeaningLocale();
  const course = useKrioluCourse();
  const unit = course.find((u) => u.lessons.some((l) => l.id === lessonId)) ?? course[0];
  const lesson = unit?.lessons.find((l) => l.id === lessonId) ?? unit?.lessons[0];

  const [seed, setSeed] = useState(() => Date.now());
  const quiz = useMemo(
    () =>
      unit && lesson
        ? buildKrioluLessonQuiz(
            krioluEntries,
            lesson,
            unit.lessons.flatMap((l) => l.words),
            locale,
            krioluPtSuggestions,
            seed,
          )
        : [],
    [unit, lesson, locale, seed],
  );
  const [i, setI] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [hits, setHits] = useState(0);
  const [reported, setReported] = useState<string | null>(null);

  const reset = () => {
    setI(0);
    setSelected(null);
    setChecked(false);
    setHits(0);
    setReported(null);
  };
  // Mudar de idioma ou de lição recomeça (as opções mudam).
  useEffect(reset, [locale, lessonId]);

  const finished = quiz.length > 0 && i >= quiz.length;
  useEffect(() => {
    if (!finished || !lesson) return;
    krioluProgress.complete(lesson.id);
    game.completeLesson(APP_CONFIG.rewards.lessonXp, APP_CONFIG.rewards.lessonCoins);
    sound.play("complete");
  }, [finished, lesson]);

  if (!unit || !lesson) return null;
  const themeName = isThemeKey(unit.theme.id) ? t(`kriolu.themes.${unit.theme.id}`) : unit.theme.id;

  if (finished) {
    return (
      <PhoneFrame className="bg-forest pattern-leaf">
        <div className="flex flex-1 flex-col items-center px-6 pt-16 text-center text-primary-foreground">
          <Neto mood="celebrate" size={150} className="animate-pop" />
          <h1 className="mt-4 font-display text-3xl font-bold">{t("kriolu.lessonDone")}</h1>
          <p className="mt-1 text-primary-foreground/80">
            {themeName} · {t("kriolu.lesson", { n: lesson.index })}
          </p>
          <p className="mt-4 font-display text-xl font-bold">
            {t("preview.score", { hits, total: quiz.length })}
          </p>
          <p className="mt-6 max-w-xs text-xs text-primary-foreground/70">
            {t("kriolu.betaNotice")}
          </p>
          <div className="mt-auto w-full space-y-3 pb-6 pt-8">
            <Link to="/learn">
              <AppButton variant="light">{t("common.continue")}</AppButton>
            </Link>
            <AppButton
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => {
                setSeed(Date.now());
                reset();
              }}
            >
              <RotateCcw className="size-4" />
              {t("result.repeat")}
            </AppButton>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  const q = quiz[i];
  if (!q) return null;
  const correct = selected === q.correctIndex;
  const letters = ["A", "B", "C", "D"];
  const optionState = (k: number) =>
    !checked ? "idle" : k === q.correctIndex ? "correct" : k === selected ? "wrong" : "idle";
  const posLabel = isPosKey(q.pos) ? t(`pos.${q.pos}`) : q.pos;
  const hint = [
    posLabel,
    q.mode === "meaning" && q.variant ? t("preview.variant", { name: q.variant }) : null,
    q.meaningSource === "pt-suggestion" ? t("preview.meaningLang") : t("preview.meaningLangEn"),
  ]
    .filter(Boolean)
    .join(" · ");
  const word = q.mode === "meaning" ? q.target : q.options[q.correctIndex]!;
  // Gravação real de falante nativa (Lingua Libre), quando existe para esta palavra.
  const pronunciation = krioluAudio.get(word);

  return (
    <PhoneFrame>
      <div className="flex items-center gap-3 px-4 pt-3">
        <BackButton close />
        <ProgressBar value={((i + (checked ? 1 : 0)) / quiz.length) * 100} />
      </div>

      <div className="mx-4 mt-3 flex items-start gap-2 rounded-2xl border border-accent/50 bg-accent/15 px-3 py-2 text-[12px] leading-snug text-accent-foreground">
        <FlaskConical className="mt-0.5 size-4 shrink-0" />
        <span>{t("kriolu.betaNotice")}</span>
      </div>

      <div className="px-5 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("kriolu.questionOf", { theme: themeName, n: i + 1, total: quiz.length })}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold">
          <Trans
            i18nKey={q.mode === "meaning" ? "preview.whatMeans" : "preview.howToSay"}
            values={{ word: q.target }}
            components={{ hl: <span className="text-primary" /> }}
          />
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        {q.mode === "meaning" && pronunciation && (
          <ListenButton
            label={t("kriolu.listen")}
            credit={
              pronunciation.speaker ? t("kriolu.voice", { name: pronunciation.speaker }) : null
            }
            onPlay={() => playPronunciation(pronunciation)}
          />
        )}
      </div>

      <div key={q.id} className="animate-rise flex-1 space-y-3 px-5 pb-48 pt-5">
        {q.options.map((label, k) => (
          <QuizOption
            key={label}
            label={label}
            letter={letters[k]!}
            selected={selected === k}
            state={optionState(k)}
            onClick={() => !checked && setSelected(k)}
          />
        ))}
      </div>

      {!checked && (
        <div className="absolute inset-x-0 bottom-0 border-t border-border/70 bg-background px-5 pb-5 pt-4">
          <AppButton
            disabled={selected === null}
            onClick={() => {
              setChecked(true);
              sound.play(correct ? "correct" : "wrong");
              if (correct) {
                setHits((h) => h + 1);
                game.addXp(APP_CONFIG.rewards.correctAnswerXp);
              }
            }}
          >
            {t("lesson.check")}
          </AppButton>
        </div>
      )}

      <BottomSheet open={checked} tone={correct ? "success" : "error"}>
        <div className="flex items-start gap-3">
          <Neto mood={correct ? "happy" : "sad"} size={64} className="-my-1 animate-pop" />
          <div className="flex-1">
            <p
              className={`font-display text-2xl font-bold ${correct ? "text-success" : "text-destructive"}`}
            >
              {correct ? t("lesson.good") : t("lesson.almost")}
            </p>
            {!correct && (
              <p className="text-sm font-semibold text-destructive">
                {t("preview.answer")} <span className="font-bold">{q.options[q.correctIndex]}</span>
              </p>
            )}
            {pronunciation && (
              <ListenButton
                label={`${t("kriolu.listen")} · «${word}»`}
                credit={
                  pronunciation.speaker ? t("kriolu.voice", { name: pronunciation.speaker }) : null
                }
                onPlay={() => playPronunciation(pronunciation)}
              />
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-muted-foreground">
              <a
                href={q.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline"
              >
                {t("preview.source")} <ExternalLink className="size-3" />
              </a>
              {reported === word ? (
                <span className="text-success">{t("kriolu.reported")}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => setReported(word)}
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
          variant={correct ? "primary" : "danger"}
          onClick={() => {
            setI(i + 1);
            setSelected(null);
            setChecked(false);
          }}
        >
          {t("common.continue")}
        </AppButton>
      </BottomSheet>
    </PhoneFrame>
  );
}

/** Botão para ouvir a pronúncia gravada por uma falante nativa, com o crédito da voz. */
function ListenButton({
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
