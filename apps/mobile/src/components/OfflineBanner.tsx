import { useNetInfo } from "@react-native-community/netinfo";
import { WifiOff } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppText, colors } from "@/design";

/** Faixa no topo enquanto o telemóvel está sem internet (igual à web). */
export function OfflineBanner() {
  const { t } = useTranslation();
  const net = useNetInfo();
  const insets = useSafeAreaInsets();
  // null = ainda a verificar: não mostra nada.
  if (net.isConnected !== false) return null;
  return (
    <View accessibilityRole="alert" style={[styles.banner, { paddingTop: insets.top + 6 }]}>
      <WifiOff size={14} color={colors.background} />
      <AppText variant="caption" style={{ color: colors.background }}>
        {t("neto.offlineBanner")}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    pointerEvents: "none",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: colors.foreground,
  },
});
