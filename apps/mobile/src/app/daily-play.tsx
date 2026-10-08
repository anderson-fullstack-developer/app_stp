import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Coins, Flame, Star, X, Zap } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Trans, useTranslation } from "react-i18next";
import type { AnswerResponse, GrantDto, QuestionDto } from "@stp/types/api";
import { useApi } from "@/api/client";
import { keys, useLearningLanguage, useMeaningLocale } from "@/api/queries";
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

interface DailyStarted {
  attemptId: string;
  locale: string;
  questions: QuestionDto[];
  answered: string[];
}
interface DailyResult extends GrantDto {
  flagged: boolean;
  total: number;
  correct: number;
  rewarded: boolean;
  rank: number | null;
}

const LETTERS = ["A", "B", "C", "D"];
const closeDaily = () => (router.canGoBack() ? router.back() : router.replace("/daily"));

/** Jogar o desafio do dia (igual à web): uma resposta por pergunta, corrigida no servidor. */
export default function DailyPlay() {
  const { t } = useTranslation();
  const api = useApi();
  const lang = useLearningLanguage();
  const locale = useMeaningLocale();
  const attempt = useQuery({
    queryKey: ["daily-attempt", lang, locale],
    queryFn: () => api.post<DailyStarted>(`/daily/${lang}/attempts`, { locale }),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
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
  if (!attempt.data) {
    return (
      <Centered>
        <Neto mood="worried" size={120} />
        <AppText variant="h3" center style={{ marginTop: space.md, maxWidth: 300 }}>
          {t("daily.notAvailable")}
        </AppText>
        <AppButton onPress={closeDaily} style={{ marginTop: space.xl, minWidth: 240 }}>
          {t("common.continue")}
        </AppButton>
      </Centered>
    );
  }
  return <DailyRun key={attempt.data.attemptId} data={attempt.data} lang={lang} />;
}

function DailyRun({ data, lang }: { data: DailyStarted; lang: string }) {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  // Ao retomar, salta as perguntas já respondidas.
  const [index, setIndex] = useState(() => {
    const first = data.questions.findIndex((q) => !data.answered.includes(q.exerciseId));
    return first === -1 ? data.questions.length : first;
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<AnswerResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DailyResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const total = data.questions.length;

  const finish = async () => {
    setBusy(true);
    try {
      const res = await api.post<DailyResult>(`/daily-attempts/${data.attemptId}/complete`);
      setResult(res);
      sound.play(res.level.leveledUp ? "levelUp" : "complete");
      haptics.success();
      void qc.invalidateQueries({ queryKey: keys.me });
      void qc.invalidateQueries({ queryKey: keys.daily(lang) });
      void qc.invalidateQueries({ queryKey: ["daily-ranking", lang] });
    } catch {
      setFailure(t("neto.errorText"));
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <GradientCard gradient="sun" style={styles.result}>
        <SafeAreaView style={{ flex: 1, alignItems: "center" }}>
          <Neto
            mood={result.flagged ? "worried" : "celebrate"}
            size={150}
            style={{ marginTop: space.xxxl }}
          />
          <AppText
            variant="h1"
            center
            style={{ color: colors.accentForeground, marginTop: space.lg }}
          >
            {t("daily.resultTitle")}
          </AppText>
          <AppText variant="h3" style={{ color: colors.accentForeground }}>
            {t("daily.score", { correct: result.correct, total: result.total })}
          </AppText>
          {result.rank ? (
            <AppText variant="bodyStrong" style={{ color: colors.accentForeground }}>
              {t("daily.rank", { rank: result.rank })}
            </AppText>
          ) : null}
          {result.flagged ? (
            <AppText center style={{ marginTop: space.xl, color: colors.accentForeground }}>
              {t("kriolu.flagged")}
            </AppText>
          ) : result.rewarded ? (
            <View style={styles.rewards}>
              <View style={styles.reward}>
                <Star size={20} color={colors.accentForeground} fill={colors.accentForeground} />
                <AppText variant="h3" style={{ color: colors.accentForeground }}>
                  +{result.xp} XP
                </AppText>
              </View>
              <View style={styles.reward}>
                <Coins size={20} color={colors.accentForeground} />
                <AppText variant="h3" style={{ color: colors.accentForeground }}>
                  {t("kriolu.coinsGained", { count: result.coins })}
                </AppText>
              </View>
            </View>
          ) : (
            <AppText center style={{ marginTop: space.xl, color: colors.accentForeground }}>
              {t("daily.alreadyPaid")}
            </AppText>
          )}
          {!result.flagged ? (
            <View style={styles.streakRow}>
              <Flame size={20} color={colors.accentForeground} fill={colors.accentForeground} />
              <AppText variant="h3" style={{ color: colors.accentForeground }}>
                {t("neto.streakDays", { count: result.streak.current })}
              </AppText>
            </View>
          ) : null}
          <View style={{ marginTop: "auto", width: "100%", paddingBottom: space.lg }}>
            <AppButton variant="light" onPress={() => router.replace("/daily")}>
              {t("common.continue")}
            </AppButton>
          </View>
          {!result.flagged ? <CelebrationModal items={celebrationsFor(result)} /> : null}
        </SafeAreaView>
      </GradientCard>
    );
  }

  const q = data.questions[index];
  if (!q) {
    return (
      <Centered>
        <Neto mood="happy" size={120} />
        <AppText tone="muted" style={{ marginTop: space.md }}>
          {failure ?? t("kriolu.saving")}
        </AppText>
        {!busy ? (
          <AppButton onPress={() => void finish()} style={{ marginTop: space.xl, minWidth: 240 }}>
            {t("common.continue")}
          </AppButton>
        ) : null}
      </Centered>
    );
  }
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
      const fb = await api.post<AnswerResponse>(`/daily-attempts/${data.attemptId}/answers`, {
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
  const next = () => {
    setSelected(null);
    setFeedback(null);
    const n = index + 1;
    setIndex(n);
    if (n >= total) void finish();
  };

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" onPress={closeDaily} hitSlop={12}>
          <X size={26} color={colors.mutedForeground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ProgressBar value={((index + (feedback ? 1 : 0)) / total) * 100} />
        </View>
      </View>
      <View style={styles.notice}>
        <Zap size={16} color={colors.accentForeground} />
        <AppText variant="caption" style={{ flex: 1, color: colors.accentForeground }}>
          {t("daily.oneAnswer")}
        </AppText>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <AppText variant="overline" tone="muted">
          {t("daily.title")} · {index + 1}/{total}
        </AppText>
        <AppText variant="h2" style={{ marginTop: space.xs }}>
          <Trans
            i18nKey={q.mode === "meaning" ? "preview.whatMeans" : "preview.howToSay"}
            values={{ word: q.prompt }}
            components={{ hl: <AppText variant="h2" tone="primary" /> }}
          />
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
        <FeedbackSheet feedback={feedback} busy={busy} onContinue={next} />
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
  notice: {
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
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: space.md },
});
