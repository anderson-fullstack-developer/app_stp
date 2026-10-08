import { useClerk, useUser } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { ArrowLeft, Check, ChevronRight, LogOut, Trash2 } from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { LOCALES } from "@stp/i18n";
import type { MeResponse } from "@stp/types/api";
import { useApi } from "@/api/client";
import { keys, useLanguages, useMe } from "@/api/queries";
import {
  AppButton,
  AppText,
  Card,
  colors,
  haptics,
  isSoundEnabled,
  Neto,
  setHapticsEnabled,
  setSoundEnabled,
  space,
} from "@/design";

function Row({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <AppText variant="bodyStrong" style={{ flex: 1 }}>
        {label}
      </AppText>
      {children}
    </View>
  );
}

/** Pergunta de confirmação (Alert no telemóvel; confirm() na pré-visualização web). */
function confirmDanger(title: string, text: string, ok: string, cancel: string) {
  if (Platform.OS === "web") return Promise.resolve(window.confirm(`${title}\n\n${text}`));
  return new Promise<boolean>((resolve) =>
    Alert.alert(title, text, [
      { text: cancel, style: "cancel", onPress: () => resolve(false) },
      { text: ok, style: "destructive", onPress: () => resolve(true) },
    ]),
  );
}

/** Definições: conta, idioma, língua a aprender, vibração, terminar sessão e eliminar conta. */
export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const api = useApi();
  const qc = useQueryClient();
  const me = useMe();
  const languages = useLanguages();
  const [vibration, setVibration] = useState(true);
  const [soundOn, setSoundOn] = useState(isSoundEnabled);
  const [busy, setBusy] = useState<"logout" | "delete" | "language" | null>(null);
  const [picker, setPicker] = useState(false);

  const available = (languages.data ?? []).flatMap((c) => c.languages).filter((l) => l.available);
  const learning = available.find((l) => l.id === me.data?.learningLanguageId);

  const save = async (patch: Partial<Pick<MeResponse, "uiLocale" | "learningLanguageId">>) => {
    const updated = await api.patch<MeResponse>("/me", patch);
    qc.setQueryData(keys.me, updated);
    return updated;
  };

  const changeUiLocale = (id: string) => {
    haptics.select();
    void i18n.changeLanguage(id);
    void save({ uiLocale: id }).catch(() => {});
  };

  const chooseLearning = async (id: string) => {
    setPicker(false);
    if (id === me.data?.learningLanguageId) return;
    setBusy("language");
    try {
      await save({ learningLanguageId: id });
      haptics.success();
      void qc.invalidateQueries(); // curso, progresso e desafio da nova língua
    } finally {
      setBusy(null);
    }
  };

  const leave = async () => {
    await signOut();
    qc.clear();
    router.replace("/welcome");
  };

  const logout = async () => {
    setBusy("logout");
    try {
      await leave();
    } finally {
      setBusy(null);
    }
  };

  const deleteAccount = async () => {
    const ok = await confirmDanger(
      t("settings.deleteTitle"),
      t("settings.deleteText"),
      t("settings.deleteConfirm"),
      t("settings.cancel"),
    );
    if (!ok) return;
    setBusy("delete");
    try {
      // O servidor apaga no Clerk e anonimiza os dados; depois só falta sair.
      await api.del("/me");
      haptics.success();
      await leave();
    } catch {
      haptics.error();
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <ArrowLeft size={24} color={colors.foreground} />
        </Pressable>
        <AppText variant="h3">{t("settings.title")}</AppText>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="overline" tone="muted">
          {t("settings.general")}
        </AppText>
        <Card style={styles.group}>
          <Row label={t("settings.account")}>
            <AppText variant="small" tone="muted" numberOfLines={1} style={{ maxWidth: 180 }}>
              {user?.primaryEmailAddress?.emailAddress ?? ""}
            </AppText>
          </Row>
          <View style={styles.sep} />
          <Row label={t("settings.uiLanguage")}>
            <View style={styles.segment}>
              {LOCALES.filter((l) => l.available).map((l) => {
                const on = i18n.language === l.id;
                return (
                  <Pressable
                    key={l.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    onPress={() => changeUiLocale(l.id)}
                    style={[styles.segItem, on && styles.segOn]}
                  >
                    <AppText variant="caption" tone={on ? "primary" : "muted"}>
                      {l.id.toUpperCase()}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </Row>
          <View style={styles.sep} />
          <Pressable accessibilityRole="button" onPress={() => setPicker(true)}>
            <Row label={t("settings.learning")}>
              <AppText variant="small" tone="muted" numberOfLines={1} style={{ maxWidth: 150 }}>
                {busy === "language" ? "…" : (learning?.name ?? "")}
              </AppText>
              <ChevronRight size={18} color={colors.mutedForeground} />
            </Row>
          </Pressable>
        </Card>

        <AppText variant="overline" tone="muted" style={{ marginTop: space.lg }}>
          {t("settings.preferences")}
        </AppText>
        <Card style={styles.group}>
          <Row label={t("settings.sound")}>
            <Switch
              value={soundOn}
              onValueChange={(v) => {
                setSoundOn(v);
                setSoundEnabled(v);
              }}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </Row>
          <View style={styles.sep} />
          <Row label={t("settings.haptics")}>
            <Switch
              value={vibration}
              onValueChange={(v) => {
                setVibration(v);
                setHapticsEnabled(v);
              }}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </Row>
        </Card>

        <View style={styles.neto}>
          <Neto mood="happy" size={88} />
        </View>
        <AppButton
          variant="secondary"
          loading={busy === "logout"}
          icon={<LogOut size={18} color={colors.destructive} />}
          onPress={() => void logout()}
        >
          <AppText variant="bodyStrong" tone="danger">
            {busy === "logout" ? t("settings.signingOut") : t("settings.signOut")}
          </AppText>
        </AppButton>
        <AppButton
          variant="ghost"
          size="md"
          loading={busy === "delete"}
          icon={<Trash2 size={16} color={colors.mutedForeground} />}
          onPress={() => void deleteAccount()}
        >
          <AppText variant="small" tone="muted">
            {busy === "delete" ? t("settings.deleting") : t("settings.deleteAccount")}
          </AppText>
        </AppButton>
      </ScrollView>

      <Modal
        visible={picker}
        transparent
        animationType="slide"
        onRequestClose={() => setPicker(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPicker(false)} />
        <View style={styles.sheet}>
          <AppText variant="h3">{t("settings.chooseLanguage")}</AppText>
          {available.map((l) => {
            const on = l.id === me.data?.learningLanguageId;
            return (
              <Pressable
                key={l.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => void chooseLearning(l.id)}
                style={[styles.option, on && styles.optionOn]}
              >
                <AppText variant="bodyStrong" style={{ flex: 1 }}>
                  {l.name}
                </AppText>
                {l.beta ? (
                  <View style={styles.beta}>
                    <AppText variant="caption" style={{ fontSize: 11 }}>
                      {t("kriolu.beta")}
                    </AppText>
                  </View>
                ) : null}
                {on ? <Check size={20} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  content: { padding: space.lg, gap: space.sm, paddingBottom: 48 },
  group: { padding: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    minHeight: 56,
  },
  sep: { height: 1, backgroundColor: colors.border, marginHorizontal: space.lg },
  segment: { flexDirection: "row", backgroundColor: colors.muted, borderRadius: 12, padding: 4 },
  segItem: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  segOn: { backgroundColor: colors.surface },
  neto: { alignItems: "center", marginTop: space.xxl, marginBottom: space.md },
  backdrop: { flex: 1, backgroundColor: "rgba(16,31,19,0.35)" },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: space.xl,
    paddingBottom: space.xxxl,
    gap: space.md,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.lg,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  beta: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});
