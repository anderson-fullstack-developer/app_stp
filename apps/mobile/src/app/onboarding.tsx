import { router } from "expo-router";
import { ArrowLeft, Check } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  COUNTRY_IDS,
  type CountryId,
  LOCALES,
  SPOKEN_LANGUAGE_IDS,
  type SpokenLanguageId,
} from "@stp/i18n";
import { useLanguages } from "@/api/queries";
import { DEFAULT_LEARNING_LANGUAGE } from "@/config";
import { AppButton, AppText, colors, haptics, LoadingState, ProgressBar, space } from "@/design";
import { useGoogleSignIn } from "@/features/auth/useGoogleSignIn";

const STEPS = 5;
const REASONS = [
  { id: "family", icon: "👨‍👩‍👧" },
  { id: "culture", icon: "🥁" },
  { id: "travel", icon: "🏝️" },
  { id: "curiosity", icon: "✨" },
  { id: "school", icon: "🎓" },
  { id: "speakBetter", icon: "🗣️" },
  { id: "other", icon: "💬" },
] as const;
type ReasonId = (typeof REASONS)[number]["id"];
const GOALS = [
  { minutes: 5, id: "casual" },
  { minutes: 10, id: "regular" },
  { minutes: 15, id: "serious" },
  { minutes: 20, id: "intense" },
] as const;

/** Escolha (cartão com borda verde quando selecionado), igual à web. */
function Choice({
  on,
  disabled,
  onPress,
  children,
  style,
}: {
  on: boolean;
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on, disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={({ pressed }) => [
        styles.choice,
        on && styles.choiceOn,
        disabled && { opacity: 0.6 },
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}
    >
      {children}
      {on ? (
        <View style={styles.check}>
          <Check size={14} color={colors.primaryForeground} strokeWidth={3} />
        </View>
      ) : null}
    </Pressable>
  );
}

/** Registo (igual à web): idioma, língua a aprender, motivos, meta, país e línguas → Google. */
export default function Onboarding() {
  const { t, i18n } = useTranslation();
  const languages = useLanguages();
  const google = useGoogleSignIn();
  const [step, setStep] = useState(1);
  const [learning, setLearning] = useState(DEFAULT_LEARNING_LANGUAGE);
  const [reasons, setReasons] = useState<ReasonId[]>([]);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [country, setCountry] = useState<CountryId | null>(null);
  const [spoken, setSpoken] = useState<SpokenLanguageId[]>([]);

  const canNext =
    step === 1 ||
    step === 2 ||
    (step === 3 && reasons.length > 0) ||
    (step === 4 && minutes !== null) ||
    (step === 5 && country !== null && spoken.length > 0);

  const back = () => (step === 1 ? router.back() : setStep(step - 1));
  const finish = () =>
    void google.signIn({
      countryCode: country ?? undefined,
      spokenLanguages: spoken,
      uiLocale: i18n.language,
      learningLanguageId: learning,
      reasons,
      dailyGoalMinutes: minutes,
    });

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={back}
          hitSlop={10}
        >
          <ArrowLeft size={24} color={colors.mutedForeground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ProgressBar value={(step / STEPS) * 100} />
        </View>
      </View>

      <ScrollView key={step} contentContainerStyle={styles.body}>
        {step === 1 ? (
          <>
            <AppText variant="h2">{t("onboarding.uiLanguageTitle")}</AppText>
            <AppText variant="small" tone="muted" style={{ marginTop: 4 }}>
              {t("onboarding.uiLanguageText")}
            </AppText>
            <View style={styles.list}>
              {LOCALES.map((l) => (
                <Choice
                  key={l.id}
                  on={l.available && i18n.language === l.id}
                  disabled={!l.available}
                  onPress={() => void i18n.changeLanguage(l.id)}
                >
                  <AppText variant="bodyStrong" style={{ flex: 1 }}>
                    {l.label}
                  </AppText>
                  {!l.available ? (
                    <AppText variant="caption" tone="muted">
                      {t("common.soon")}
                    </AppText>
                  ) : null}
                </Choice>
              ))}
            </View>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <AppText variant="h2">{t("onboarding.learnTitle")}</AppText>
            {!languages.data ? (
              <LoadingState rows={2} />
            ) : (
              languages.data.map((c) => (
                <View key={c.id} style={{ marginTop: space.xl }}>
                  <AppText variant="overline" tone="muted" style={{ marginBottom: space.sm }}>
                    {t(`countries.${c.id as CountryId}`, c.name)}
                  </AppText>
                  <View style={{ gap: space.md }}>
                    {c.languages.map((l) => (
                      <Choice
                        key={l.id}
                        on={l.available && learning === l.id}
                        disabled={!l.available}
                        onPress={() => setLearning(l.id)}
                      >
                        <View
                          style={[
                            styles.langBadge,
                            !l.available && { backgroundColor: colors.muted },
                          ]}
                        >
                          <AppText variant="h3" tone={l.available ? "inverse" : "muted"}>
                            {l.name.charAt(0)}
                          </AppText>
                        </View>
                        <AppText variant="bodyStrong" style={{ flex: 1 }}>
                          {l.name}
                        </AppText>
                        <View
                          style={[
                            styles.tag,
                            {
                              backgroundColor: !l.available
                                ? colors.muted
                                : l.beta
                                  ? colors.accent
                                  : colors.successSoft,
                            },
                          ]}
                        >
                          <AppText variant="caption" style={{ fontSize: 11 }}>
                            {!l.available
                              ? t("common.soon")
                              : l.beta
                                ? t("kriolu.beta")
                                : t("common.available")}
                          </AppText>
                        </View>
                      </Choice>
                    ))}
                  </View>
                </View>
              ))
            )}
          </>
        ) : null}

        {step === 3 ? (
          <>
            <AppText variant="h2">{t("onboarding.reasonsTitle")}</AppText>
            <AppText variant="small" tone="muted" style={{ marginTop: 4 }}>
              {t("onboarding.reasonsText")}
            </AppText>
            <View style={styles.grid}>
              {REASONS.map((r) => {
                const on = reasons.includes(r.id);
                return (
                  <Choice
                    key={r.id}
                    on={on}
                    onPress={() =>
                      setReasons(on ? reasons.filter((x) => x !== r.id) : [...reasons, r.id])
                    }
                    style={styles.reason}
                  >
                    <View style={{ gap: space.sm }}>
                      <AppText style={{ fontSize: 30 }}>{r.icon}</AppText>
                      <AppText variant="bodyStrong">{t(`onboarding.reasons.${r.id}`)}</AppText>
                    </View>
                  </Choice>
                );
              })}
            </View>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <AppText variant="h2">{t("onboarding.goalTitle")}</AppText>
            <View style={styles.list}>
              {GOALS.map((g) => (
                <Choice
                  key={g.minutes}
                  on={minutes === g.minutes}
                  onPress={() => setMinutes(g.minutes)}
                >
                  <AppText variant="bodyStrong" style={{ flex: 1 }}>
                    {t("common.minutes", { count: g.minutes })}
                  </AppText>
                  <AppText variant="small" tone="muted">
                    {t(`onboarding.goals.${g.id}`)}
                  </AppText>
                </Choice>
              ))}
            </View>
          </>
        ) : null}

        {step === 5 ? (
          <>
            <AppText variant="h2">{t("register.title")}</AppText>
            <AppText variant="bodyStrong" style={{ marginTop: space.xl }}>
              {t("register.country")}
            </AppText>
            <View style={styles.chips}>
              {COUNTRY_IDS.map((id) => {
                const on = country === id;
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      haptics.select();
                      setCountry(id);
                    }}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <AppText
                      variant="small"
                      tone={on ? "primary" : "default"}
                      style={{ fontFamily: "Figtree_600SemiBold" }}
                    >
                      {t(`countries.${id}`)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            <AppText variant="h3" style={{ marginTop: space.xl }}>
              {t("register.spokenTitle")}
            </AppText>
            <AppText variant="caption" tone="muted">
              {t("register.spokenText")}
            </AppText>
            <View style={styles.chips}>
              {SPOKEN_LANGUAGE_IDS.map((id) => {
                const on = spoken.includes(id);
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    onPress={() => {
                      haptics.select();
                      setSpoken(on ? spoken.filter((x) => x !== id) : [...spoken, id]);
                    }}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    {on ? <Check size={14} color={colors.primary} /> : null}
                    <AppText
                      variant="small"
                      tone={on ? "primary" : "default"}
                      style={{ fontFamily: "Figtree_600SemiBold" }}
                    >
                      {t(`spokenLanguages.${id}`)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            {google.error ? (
              <AppText variant="small" tone="danger" center style={{ marginTop: space.lg }}>
                {google.error}
              </AppText>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {step < STEPS ? (
          <AppButton disabled={!canNext} onPress={() => setStep(step + 1)}>
            {t("common.continue")}
          </AppButton>
        ) : (
          <>
            <AppButton disabled={!canNext} loading={google.busy} onPress={finish}>
              {t("register.google")}
            </AppButton>
            <AppButton variant="ghost" size="md" onPress={() => router.replace("/sign-in")}>
              {t("onboarding.haveAccount")}
            </AppButton>
          </>
        )}
      </View>
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
  body: { paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space.xxxl },
  list: { gap: space.md, marginTop: space.xl },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md, marginTop: space.xl },
  reason: { width: "47.5%", flexGrow: 1, alignItems: "flex-start", minHeight: 104 },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 60,
    padding: space.lg,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  choiceOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  langBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  tag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.md },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  footer: { padding: space.xl, gap: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
});
