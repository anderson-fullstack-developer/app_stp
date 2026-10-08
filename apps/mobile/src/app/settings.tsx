import { useClerk, useUser } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { ArrowLeft, LogOut } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { LOCALES } from "@stp/i18n";
import {
  AppButton,
  AppText,
  Card,
  colors,
  haptics,
  Neto,
  setHapticsEnabled,
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

/** Definições (essencial da web): conta, idioma, vibração e terminar sessão. */
export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const qc = useQueryClient();
  const [vibration, setVibration] = useState(true);
  const [leaving, setLeaving] = useState(false);

  const logout = async () => {
    setLeaving(true);
    try {
      await signOut();
      qc.clear();
    } finally {
      setLeaving(false);
      router.replace("/welcome");
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
                    onPress={() => {
                      haptics.select();
                      void i18n.changeLanguage(l.id);
                    }}
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
        </Card>

        <AppText variant="overline" tone="muted" style={{ marginTop: space.lg }}>
          {t("settings.preferences")}
        </AppText>
        <Card style={styles.group}>
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
          loading={leaving}
          icon={<LogOut size={18} color={colors.destructive} />}
          onPress={() => void logout()}
        >
          <AppText variant="bodyStrong" tone="danger">
            {leaving ? t("settings.signingOut") : t("settings.signOut")}
          </AppText>
        </AppButton>
      </ScrollView>
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
});
