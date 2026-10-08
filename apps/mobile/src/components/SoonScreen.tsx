import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppText, colors, EmptyState, space } from "@/design";

/** Ecrã ainda por passar para a app (o Neto avisa que chega em breve). */
export function SoonScreen({ title }: { title: string }) {
  const { t } = useTranslation();
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <AppText variant="h2" center style={{ marginTop: space.lg }}>
        {title}
      </AppText>
      <EmptyState title={t("common.soon")} text={t("learn.soonInApp")} />
    </SafeAreaView>
  );
}
