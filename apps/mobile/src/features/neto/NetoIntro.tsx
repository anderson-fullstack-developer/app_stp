import AsyncStorage from "@react-native-async-storage/async-storage";
import { BellRing, BookOpen, PartyPopper } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppButton, AppText, colors, Neto, shadows, space } from "@/design";

const SEEN_KEY = "falaneto:neto-intro-v1";

/** "Conhece o Neto" (igual à web): quem é, porque se chama Neto e o que faz. */
export function NetoIntro({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const items = [
    { Icon: BookOpen, text: t("neto.introLessons") },
    { Icon: PartyPopper, text: t("neto.introCelebrate") },
    { Icon: BellRing, text: t("neto.introRemind") },
  ];
  return (
    <Modal transparent animationType="fade" visible={open} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={[styles.card, shadows.float]}>
            <Neto mood="celebrate" size={150} />
            <AppText variant="h1" center style={{ marginTop: space.md }}>
              {t("neto.introTitle")}
            </AppText>
            <AppText variant="small" tone="muted" center style={{ marginTop: space.sm }}>
              {t("neto.introText1")}
            </AppText>
            <AppText
              variant="small"
              tone="primary"
              center
              style={{ marginTop: space.sm, fontFamily: "Figtree_600SemiBold" }}
            >
              {t("neto.introText2")}
            </AppText>
            <View style={styles.items}>
              {items.map(({ Icon, text }) => (
                <View key={text} style={styles.item}>
                  <View style={styles.itemIcon}>
                    <Icon size={20} color={colors.primary} />
                  </View>
                  <AppText variant="small" style={{ flex: 1, fontFamily: "Figtree_600SemiBold" }}>
                    {text}
                  </AppText>
                </View>
              ))}
            </View>
            <AppButton onPress={onClose} style={{ marginTop: space.xl }}>
              {t("neto.introCta")}
            </AppButton>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

/** Mostra a apresentação uma única vez (primeira entrada na app). */
export function NetoIntroOnce() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(SEEN_KEY)
      .then((v) => {
        if (alive && !v) setOpen(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const close = () => {
    setOpen(false);
    void AsyncStorage.setItem(SEEN_KEY, "1").catch(() => {});
  };
  return <NetoIntro open={open} onClose={close} />;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(16,31,19,0.45)" },
  scroll: { flexGrow: 1, justifyContent: "center", padding: space.xl },
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 32,
    padding: space.xxl,
  },
  items: { alignSelf: "stretch", gap: space.sm, marginTop: space.lg },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: "rgba(238,233,223,0.7)",
    borderRadius: 16,
    padding: space.md,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
});
