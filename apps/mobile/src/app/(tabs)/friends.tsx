import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PublicUserDto } from "@stp/types/api";
import { Check, Flame, Search, UserMinus, UserPlus, X } from "lucide-react-native";
import { type ReactNode, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useApi } from "@/api/client";
import { useFriends, useUserSearch } from "@/api/queries";
import {
  AppButton,
  AppText,
  Avatar,
  Card,
  colors,
  EmptyState,
  ErrorState,
  fonts,
  haptics,
  LoadingState,
  space,
  Tabs,
} from "@/design";

type Tab = "friends" | "requests" | "search";

/** Pequeno atraso para não pesquisar a cada tecla. */
function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** Amigos (igual à web): lista, pedidos e pesquisa de pessoas, tudo do servidor. */
export default function FriendsTab() {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("friends");
  const [q, setQ] = useState("");
  const query = useDebounced(q.trim());
  const searching = query.replace(/^@/, "").length >= 2;
  const friends = useFriends();
  const results = useUserSearch(tab === "search" ? query : "");

  const act = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => haptics.success(),
    onSettled: () => qc.invalidateQueries({ queryKey: ["social"] }),
  });
  const run = (fn: () => Promise<unknown>) => act.mutate(fn);
  const confirm = (message: string, label: string, fn: () => Promise<unknown>) =>
    Alert.alert(message, undefined, [
      { text: t("common.cancel"), style: "cancel" },
      { text: label, style: "destructive", onPress: () => run(fn) },
    ]);

  const data = friends.data;

  let body: ReactNode;
  if (friends.isPending) body = <LoadingState />;
  else if (!data) body = <ErrorState onRetry={() => void friends.refetch()} />;
  else if (tab === "friends") {
    body =
      data.friends.length === 0 ? (
        <EmptyState title={t("neto.noFriendsTitle")} text={t("neto.noFriendsText")} />
      ) : (
        data.friends.map((f) => (
          <PersonCard
            key={f.id}
            user={f}
            detail={t("social.weeklyXp", { level: f.level, xp: f.weeklyXp })}
          >
            <AppButton
              size="md"
              variant="secondary"
              icon={<UserMinus size={16} color={colors.foreground} />}
              style={{ flex: 1 }}
              onPress={() =>
                confirm(t("social.removeConfirm", { name: f.name }), t("social.remove"), () =>
                  api.del(`/friends/${f.id}`),
                )
              }
            >
              {t("social.remove")}
            </AppButton>
            <AppButton
              size="md"
              variant="ghost"
              style={{ flex: 1 }}
              onPress={() =>
                confirm(t("social.blockConfirm", { name: f.name }), t("social.block"), () =>
                  api.post(`/blocks/${f.id}`),
                )
              }
            >
              {t("social.block")}
            </AppButton>
          </PersonCard>
        ))
      );
  } else if (tab === "requests") {
    body = (
      <>
        {data.incoming.length === 0 ? (
          <EmptyState title={t("social.noRequests")} />
        ) : (
          data.incoming.map((r) => (
            <PersonCard
              key={r.requestId}
              user={r.user}
              detail={t("social.levelOnly", { level: r.user.level })}
            >
              <AppButton
                size="md"
                icon={<Check size={16} color={colors.primaryForeground} />}
                style={{ flex: 1 }}
                onPress={() => run(() => api.post(`/friends/requests/${r.requestId}/accept`))}
              >
                {t("social.accept")}
              </AppButton>
              <AppButton
                size="md"
                variant="secondary"
                icon={<X size={16} color={colors.foreground} />}
                style={{ flex: 1 }}
                onPress={() => run(() => api.post(`/friends/requests/${r.requestId}/decline`))}
              >
                {t("social.decline")}
              </AppButton>
            </PersonCard>
          ))
        )}
        {data.outgoing.length > 0 && (
          <>
            <AppText variant="h3" style={{ marginTop: space.md }}>
              {t("social.sentTitle")}
            </AppText>
            {data.outgoing.map((r) => (
              <PersonCard
                key={r.requestId}
                user={r.user}
                detail={t("social.levelOnly", { level: r.user.level })}
              >
                <AppButton
                  size="md"
                  variant="secondary"
                  style={{ flex: 1 }}
                  onPress={() => run(() => api.post(`/friends/requests/${r.requestId}/decline`))}
                >
                  {t("social.cancel")}
                </AppButton>
              </PersonCard>
            ))}
          </>
        )}
      </>
    );
  } else if (!searching) body = <EmptyState title={t("social.searchHint")} />;
  else if (results.isPending) body = <LoadingState />;
  else if (!results.data) body = <ErrorState onRetry={() => void results.refetch()} />;
  else if (results.data.length === 0) body = <EmptyState title={t("social.noResults")} />;
  else {
    body = results.data.map((u) => {
      const incoming = data.incoming.find((r) => r.user.id === u.id);
      let action: ReactNode;
      if (u.relationship === "friends") action = <Pill>{t("social.friends")}</Pill>;
      else if (u.relationship === "pending_out") action = <Pill>{t("social.pending")}</Pill>;
      else if (u.relationship === "pending_in" && incoming) {
        action = (
          <AppButton
            size="md"
            onPress={() => run(() => api.post(`/friends/requests/${incoming.requestId}/accept`))}
          >
            {t("social.accept")}
          </AppButton>
        );
      } else {
        action = (
          <AppButton
            size="md"
            icon={<UserPlus size={16} color={colors.primaryForeground} />}
            onPress={() => run(() => api.post("/friends/requests", { userId: u.id }))}
          >
            {t("social.add")}
          </AppButton>
        );
      }
      return (
        <PersonCard
          key={u.id}
          user={u}
          detail={t("social.levelOnly", { level: u.level })}
          inline={action}
        />
      );
    });
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppText variant="h2">{t("nav.friends")}</AppText>
        <View style={styles.search}>
          <Search size={20} color={colors.mutedForeground} />
          <TextInput
            value={q}
            onChangeText={(v) => {
              setQ(v);
              if (v.trim()) setTab("search");
            }}
            placeholder={t("social.searchPlaceholder")}
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={t("social.searchPlaceholder")}
            style={styles.input}
          />
        </View>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            {
              value: "friends",
              label: t("social.tabFriends", { count: data?.friends.length ?? 0 }),
            },
            {
              value: "requests",
              label: t("social.tabRequests", { count: data?.incoming.length ?? 0 }),
            },
            { value: "search", label: t("social.tabSearch") },
          ]}
        />
        {act.isError && (
          <AppText variant="small" tone="danger" center accessibilityRole="alert">
            {t("social.error")}
          </AppText>
        )}
        {body}
      </ScrollView>
    </SafeAreaView>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <View style={styles.pill}>
      <AppText variant="caption" tone="muted">
        {children}
      </AppText>
    </View>
  );
}

function PersonCard({
  user,
  detail,
  inline,
  children,
}: {
  user: PublicUserDto;
  detail: string;
  inline?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Avatar name={user.name} color={user.avatarColor} size={52} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {user.name}
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            @{user.username}
          </AppText>
          <AppText variant="caption" tone="muted">
            {detail}
          </AppText>
        </View>
        {inline ?? (
          <View style={styles.streak}>
            <Flame size={16} color={colors.destructive} fill={colors.destructive} />
            <AppText variant="bodyStrong" tone="danger">
              {user.streak}
            </AppText>
          </View>
        )}
      </View>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    height: 48,
    paddingHorizontal: space.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: { flex: 1, fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.foreground },
  card: { padding: space.lg, borderRadius: 24 },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  streak: { flexDirection: "row", alignItems: "center", gap: 4 },
  actions: { flexDirection: "row", gap: space.sm, marginTop: space.md },
  pill: {
    height: 36,
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: 12,
    backgroundColor: colors.muted,
  },
});
