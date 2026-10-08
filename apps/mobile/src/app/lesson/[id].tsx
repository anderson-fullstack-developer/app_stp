import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Coins, Flame, FlaskConical, RotateCcw, Star, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Trans, useTranslation } from "react-i18next";
import type { AnswerResponse, LessonResultDto, StartedLesson } from "@stp/types/api";
import { ApiError, useApi } from "@/api/client";
import { keys, useCourse, useLearningLanguage, useMeaningLocale } from "@/api/queries";
import {
  AppButton,
  AppText,
  colors,
  GradientCard,
  haptics,
  Neto,
  ProgressBar,
  sound,
  space,
} from "@/design";
import { FeedbackSheet } from "@/features/lesson/FeedbackSheet";
import { CelebrationModal, celebrationsFor } from "@/features/neto/CelebrationModal";
import { QuizOption } from "@/features/lesson/QuizOption";

const LETTERS = ["A", "B", "C", "D"];
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
 * Lição jogada no servidor (igual à web): o servidor gera as perguntas e corrige cada
 * resposta; erradas voltam no fim; a conclusão paga XP, moedas e sequência.
 */
export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const locale = useMeaningLocale();
  const lang = useLearningLanguage();
  const course = useCourse(lang);
  const [run, setRun] = useState(0);

  const unit = course.data?.units.find((u) => u.lessons.some((l) => l.id === id));
  const lessonMeta = unit?.lessons.find((l) => l.id === id);
  const themeName = unit?.slug ? t(`kriolu.themes.${unit.slug as ThemeKey}`) : "";

  const attempt = useQuery({
    queryKey: ["lesson-attempt", id, locale, run],
    queryFn: () => api.post<StartedLesson>(`/lessons/${id}/attempts`, { locale }),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const data = attempt.data;

  if (attempt.isPending) {
    return (
      <Centered>
        <Neto mood="happy" size={120} />
        <AppText tone="muted" style={{ marginTop: space.md }}>
          {t("kriolu.starting")}
        </AppText>
      </Centered>
    );
  }
  if (attempt.isError || !data) {
    const locked = attempt.error instanceof ApiError && attempt.error.status === 403;
    return (
      <Centered>
        <Neto mood={locked ? "worried" : "sad"} size={120} />
        <AppText variant="h3" center style={{ marginTop: space.md, maxWidth: 300 }}>
          {locked ? t("kriolu.locked") : t("kriolu.startError")}
        </AppText>
        <AppButton onPress={closeLesson} style={{ marginTop: space.xl, minWidth: 240 }}>
          {t("common.continue")}
        </AppButton>
      </Centered>
    );
  }
  // Uma tentativa nova (ou "repetir") começa com estado limpo: o componente remonta.
  return (
    <LessonRun
      key={data.attemptId}
      data={data}
      themeName={themeName}
      lessonOrder={lessonMeta?.order ?? 1}
      onRepeat={() => setRun((r) => r + 1)}
      onDone={() => {
        void qc.invalidateQueries({ queryKey: keys.me });
        void qc.invalidateQueries({ queryKey: keys.lessons(lang) });
      }}
    />
  );
}

const closeLesson = () => (router.canGoBack() ? router.back() : router.replace("/learn"));

function LessonRun({
  data,
  themeName,
  lessonOrder,
  onRepeat,
  onDone,
}: {
  data: StartedLesson;
  themeName: string;
  lessonOrder: number;
  onRepeat: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const api = useApi();
  const [queue, setQueue] = useState<number[]>(() => data.questions.map((_, k) => k));
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<AnswerResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LessonResultDto | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const close = closeLesson;

  if (result) {
    return (
      <GradientCard gradient="forest" style={styles.result}>
        <SafeAreaView style={{ flex: 1, alignItems: "center" }}>
          <Neto
            mood={result.flagged ? "worried" : "celebrate"}
            size={150}
            style={{ marginTop: space.xxxl }}
          />
          <AppText variant="h1" tone="inverse" center style={{ marginTop: space.lg }}>
            {t("kriolu.lessonDone")}
          </AppText>
          <AppText tone="inverse" style={{ opacity: 0.8 }}>
            {themeName} · {t("kriolu.lesson", { n: lessonOrder })}
          </AppText>
          {result.flagged ? (
            <AppText tone="inverse" center style={{ marginTop: space.xl, maxWidth: 300 }}>
              {t("kriolu.flagged")}
            </AppText>
          ) : (
            <>
              <View style={styles.rewards}>
                <View style={[styles.reward, { backgroundColor: colors.accent }]}>
                  <Star size={20} color={colors.accentForeground} fill={colors.accentForeground} />
                  <AppText variant="h3" style={{ color: colors.accentForeground }}>
                    +{result.xp} XP
                  </AppText>
                </View>
                {result.coins > 0 ? (
                  <View style={[styles.reward, { backgroundColor: colors.primaryForeground }]}>
                    <Coins size={20} color={colors.secondary} />
                    <AppText variant="h3" style={{ color: colors.secondary }}>
                      {t("kriolu.coinsGained", { count: result.coins })}
                    </AppText>
                  </View>
                ) : null}
              </View>
              <AppText
                tone="inverse"
                style={{ marginTop: space.lg, fontFamily: "Figtree_600SemiBold" }}
              >
                {t("kriolu.firstTry", { hits: result.correctFirstTry, total: result.total })}
              </AppText>
              <View style={styles.streakRow}>
                <Flame size={20} color="#fff" fill="#fff" />
                <AppText variant="h3" tone="inverse">
                  {t("neto.streakDays", { count: result.streak.current })}
                </AppText>
              </View>
              {result.level.leveledUp ? (
                <AppText variant="h3" style={{ color: colors.accent, marginTop: space.sm }}>
                  {t("kriolu.levelUp", { level: result.level.after })}
                </AppText>
              ) : null}
              {result.achievements.length > 0 ? (
                <AppText tone="inverse" style={{ marginTop: space.xs }}>
                  🏅 {t("kriolu.achievement")}
                </AppText>
              ) : null}
              <AppText
                variant="caption"
                tone="inverse"
                style={{ opacity: 0.75, marginTop: space.lg }}
              >
                ✓ {t("kriolu.saved")}
              </AppText>
            </>
          )}
          <View style={styles.resultActions}>
            <AppButton variant="light" onPress={close}>
              {t("common.continue")}
            </AppButton>
            <AppButton
              variant="ghost"
              icon={<RotateCcw size={16} color={colors.primaryForeground} />}
              onPress={onRepeat}
            >
              <AppText tone="inverse" variant="bodyStrong">
                {t("result.repeat")}
              </AppText>
            </AppButton>
          </View>
          {!result.flagged ? <CelebrationModal items={celebrationsFor(result)} /> : null}
        </SafeAreaView>
      </GradientCard>
    );
  }

  const total = data.questions.length;
  const head = queue[0];
  const q = head === undefined ? undefined : data.questions[head];
  if (!q) {
    return (
      <Centered>
        <Neto mood="happy" size={120} />
        <AppText tone="muted" style={{ marginTop: space.md }}>
          {failure ?? t("kriolu.saving")}
        </AppText>
      </Centered>
    );
  }
  const solved = total - queue.length + (feedback?.correct ? 1 : 0);
  const posKey = POS_KEY[q.partOfSpeech as keyof typeof POS_KEY];
  const hint = [
    posKey ? t(`pos.${posKey}`) : null,
    data.locale === "pt" ? t("preview.meaningLang") : t("preview.meaningLangEn"),
  ]
    .filter(Boolean)
    .join(" · ");
  const optionState = (oid: string) =>
    !feedback
      ? "idle"
      : oid === feedback.correctOptionId
        ? "correct"
        : oid === selected
          ? "wrong"
          : "idle";

  const check = async () => {
    if (!selected) return;
    setBusy(true);
    setFailure(null);
    try {
      const fb = await api.post<AnswerResponse>(`/lesson-attempts/${data.attemptId}/answers`, {
        exerciseId: q.exerciseId,
        optionId: selected,
      });
      setFeedback(fb);
      sound.play(fb.correct ? "correct" : "wrong");
      if (fb.correct) haptics.success();
      else haptics.error();
    } catch {
      setFailure(t("neto.errorText"));
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    if (!feedback || head === undefined) return;
    const rest = queue.slice(1);
    const nextQueue = feedback.correct ? rest : [...rest, head]; // errada volta para o fim
    setSelected(null);
    setFeedback(null);
    if (nextQueue.length > 0) {
      setQueue(nextQueue);
      return;
    }
    setQueue([]);
    setBusy(true);
    try {
      const res = await api.post<LessonResultDto>(`/lesson-attempts/${data.attemptId}/complete`);
      setResult(res);
      sound.play(res.level.leveledUp ? "levelUp" : "complete");
      haptics.success();
      onDone();
    } catch {
      setFailure(t("neto.errorText"));
      setQueue([head]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          onPress={close}
          hitSlop={12}
        >
          <X size={26} color={colors.mutedForeground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ProgressBar value={(solved / total) * 100} />
        </View>
      </View>
      <View style={styles.beta}>
        <FlaskConical size={16} color={colors.accentForeground} />
        <AppText variant="caption" style={{ flex: 1, color: colors.accentForeground }}>
          {t("kriolu.betaNotice")}
        </AppText>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <AppText variant="overline" tone="muted">
          {t("kriolu.questionOf", {
            theme: themeName,
            n: Math.min(total - queue.length + 1, total),
            total,
          })}
        </AppText>
        <AppText variant="h2" style={{ marginTop: space.xs }}>
          <Trans
            i18nKey={q.mode === "meaning" ? "preview.whatMeans" : "preview.howToSay"}
            values={{ word: q.prompt }}
            components={{ hl: <AppText variant="h2" tone="primary" /> }}
          />
        </AppText>
        <AppText variant="caption" tone="muted" style={{ marginTop: space.xs }}>
          {hint}
        </AppText>
        <View style={styles.options}>
          {q.options.map((o, k) => (
            <QuizOption
              key={o.id}
              label={o.label}
              letter={LETTERS[k]!}
              selected={selected === o.id}
              state={optionState(o.id)}
              onPress={() => !feedback && !busy && setSelected(o.id)}
            />
          ))}
        </View>
        {failure ? (
          <AppText variant="small" tone="danger" center>
            {failure}
          </AppText>
        ) : null}
      </ScrollView>

      {!feedback ? (
        <View style={styles.footer}>
          <AppButton disabled={!selected} loading={busy} onPress={() => void check()}>
            {t("lesson.check")}
          </AppButton>
        </View>
      ) : (
        <FeedbackSheet
          feedback={feedback}
          note={t("kriolu.retryLater")}
          busy={busy}
          onContinue={() => void next()}
        />
      )}
    </SafeAreaView>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={[styles.page, { alignItems: "center", justifyContent: "center" }]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  beta: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.sm,
    marginHorizontal: space.lg,
    marginTop: space.md,
    padding: space.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(253,202,58,0.5)",
    backgroundColor: "rgba(253,202,58,0.15)",
  },
  body: { paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: 220 },
  options: { gap: space.md, marginTop: space.xl },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: space.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  result: { flex: 1, borderRadius: 0, padding: space.xl },
  rewards: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.xl },
  reward: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: space.xs },
  resultActions: { marginTop: "auto", width: "100%", gap: space.md, paddingBottom: space.lg },
});
