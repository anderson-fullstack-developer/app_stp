import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ShopPurchaseDto } from "@stp/types/api";
import * as Crypto from "expo-crypto";
import { router } from "expo-router";
import { ArrowLeft, Coins, Snowflake } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ApiError, useApi } from "@/api/client";
import { keys, useShop } from "@/api/queries";
import {
  AppButton,
  AppText,
  Card,
  colors,
  ErrorState,
  GradientCard,
  haptics,
  LoadingState,
  Neto,
  shadows,
  sound,
  space,
} from "@/design";

/** Loja (igual à web): proteção de streak paga com moedas; o servidor decide tudo. */
export default function Shop() {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const shop = useShop();
  // Um id por compra: se a rede falhar e a pessoa tocar outra vez, o servidor não cobra 2×.
  const [requestId, setRequestId] = useState(() => Crypto.randomUUID());
  const [done, setDone] = useState(false);
  const buy = useMutation({
    mutationFn: () => api.post<ShopPurchaseDto>("/shop/streak-freeze", { requestId }),
    onSuccess: () => {
      haptics.success();
      sound.play("coins");
      setDone(true);
      setRequestId(Crypto.randomUUID());
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.shop });
      void qc.invalidateQueries({ queryKey: keys.me });
    },
  });
  const data = shop.data;
  const freeze = data?.items.find((i) => i.id === "streak_freeze");
  const notEnough =
    (buy.error instanceof ApiError && buy.error.code === "NOT_ENOUGH_COINS") ||
    (freeze && freeze.owned < freeze.max && data && data.coins < freeze.price);

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={24} color={colors.foreground} />
        </Pressable>
        <AppText variant="h3">{t("shop.title")}</AppText>
        <View style={{ width: 24 }} />
      </View>
      {shop.isPending ? (
        <LoadingState />
      ) : !data ? (
        <ErrorState onRetry={() => void shop.refetch()} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <GradientCard gradient="cocoa">
            <AppText variant="overline" tone="inverse" style={{ opacity: 0.75 }}>
              {t("shop.balance")}
            </AppText>
            <View style={styles.balance}>
              <Coins size={30} color={colors.accent} />
              <AppText variant="display" tone="inverse">
                {data.coins}
              </AppText>
            </View>
            <AppText variant="caption" tone="inverse" style={{ opacity: 0.75 }}>
              {t("shop.balanceNote")}
            </AppText>
          </GradientCard>

          <AppText variant="h3" style={{ marginTop: space.md }}>
            {t("shop.items")}
          </AppText>
          {freeze && (
            <Card style={{ gap: space.md }}>
              <View style={styles.item}>
                <View style={styles.icon}>
                  <Snowflake size={30} color="#ffffff" />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="h3">{t("shop.freezeName")}</AppText>
                  <AppText variant="small" tone="muted">
                    {t("shop.freezeText", { max: freeze.max })}
                  </AppText>
                  <AppText variant="caption" tone="primary" style={{ marginTop: 4 }}>
                    {t("shop.owned", { owned: freeze.owned, max: freeze.max })}
                  </AppText>
                </View>
              </View>
              <AppButton
                variant="sun"
                disabled={!freeze.canBuy}
                loading={buy.isPending}
                icon={
                  freeze.owned < freeze.max ? (
                    <Coins size={18} color={colors.accentForeground} />
                  ) : undefined
                }
                onPress={() => buy.mutate()}
              >
                {freeze.owned >= freeze.max ? t("shop.full") : `${t("shop.buy")} · ${freeze.price}`}
              </AppButton>
              {notEnough ? (
                <AppText variant="small" tone="muted" center>
                  {t("shop.notEnough")}
                </AppText>
              ) : buy.isError ? (
                <AppText variant="small" tone="danger" center>
                  {t("social.error")}
                </AppText>
              ) : null}
            </Card>
          )}
          <AppText variant="small" tone="muted" center style={{ marginTop: space.md }}>
            {t("shop.moreSoon")}
          </AppText>
        </ScrollView>
      )}
      <Modal transparent animationType="fade" visible={done} onRequestClose={() => setDone(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.modal, shadows.float]}>
            <Neto mood="celebrate" size={110} />
            <AppText variant="h2" center style={{ marginTop: space.md }}>
              {t("shop.bought")}
            </AppText>
            <AppText variant="small" tone="muted" center style={{ marginTop: space.xs }}>
              {t("shop.boughtText")}
            </AppText>
            <AppButton
              onPress={() => setDone(false)}
              style={{ marginTop: space.xl, alignSelf: "stretch" }}
            >
              {t("shop.nice")}
            </AppButton>
          </View>
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
  balance: { flexDirection: "row", alignItems: "center", gap: space.sm, marginVertical: 4 },
  item: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  icon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.ocean,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(16,31,19,0.45)",
    justifyContent: "center",
    padding: space.xl,
  },
  modal: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 32,
    padding: space.xxl,
  },
});
