import { MULTIPLAYER_CONFIG } from "@stp/config";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Swords } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFriends } from "@/api/queries";
import {
  AppButton,
  AppText,
  Avatar,
  Card,
  colors,
  EmptyState,
  GradientCard,
  LoadingState,
  space,
} from "@/design";
import { arena, arenaError, useArena } from "@/features/arena/arena";

/** Duelo 1 contra 1 (igual à web): escolher um amigo e esperar que entre. */
export default function Duel() {
  const { friend } = useLocalSearchParams<{ friend?: string }>();
  const s = useArena();
  const friends = useFriends();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const auto = useRef<string | null>(null);
  const inDuel = s.room?.mode === "duel";

  // A partida começou (ou acabou com resultado): ecrã do jogo.
  useEffect(() => {
    if (inDuel && (s.match || s.finished)) router.replace("/points-match");
  }, [inDuel, s.match, s.finished]);

  const challenge = async (userId: string) => {
    setBusy(userId);
    setError(null);
    const r = await arena.challenge(userId);
    if (!r.ok) setError(arenaError(r));
    setBusy(null);
  };

  // Veio do botão "Desafiar" de um amigo: desafia logo (uma vez).
  useEffect(() => {
    if (!friend || s.status !== "ready" || auto.current === friend) return;
    auto.current = friend;
    void challenge(friend);
  }, [friend, s.status]);

  const me = s.room?.members.find((m) => m.userId === s.me);
  const other = s.room?.members.find((m) => m.userId !== s.me);

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={24} color={colors.foreground} />
        </Pressable>
        <AppText variant="h3">Duelo 1 contra 1</AppText>
        <View style={{ width: 24 }} />
      </View>
      {inDuel && s.room ? (
        <View style={styles.waiting}>
          <View style={styles.vs}>
            <View style={styles.side}>
              <Avatar name={me?.name ?? "Tu"} color={me?.avatarColor ?? null} size={84} />
              <AppText variant="bodyStrong">Tu</AppText>
            </View>
            <AppText variant="display" tone="muted">
              VS
            </AppText>
            <View style={styles.side}>
              {other ? (
                <Avatar name={other.name} color={other.avatarColor} size={84} />
              ) : (
                <View style={styles.unknown}>
                  <AppText variant="h1" tone="muted">
                    ?
                  </AppText>
                </View>
              )}
              <AppText variant="bodyStrong">{other?.name ?? "…"}</AppText>
            </View>
          </View>
          <AppText variant="small" tone="muted" center>
            {other
              ? "A preparar o duelo…"
              : "Convite enviado! O duelo começa assim que o teu amigo entrar (o convite dura 10 minutos)."}
          </AppText>
          <AppButton variant="secondary" onPress={() => void arena.leave()}>
            Cancelar duelo
          </AppButton>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <GradientCard gradient="forest">
            <Swords size={30} color="#ffffff" />
            <AppText variant="h2" tone="inverse" style={{ marginTop: space.sm }}>
              Desafia um amigo
            </AppText>
            <AppText variant="small" tone="inverse" style={{ opacity: 0.85 }}>
              {MULTIPLAYER_CONFIG.duel.questions} perguntas iguais para os dois. Cada certa vale 100
              pontos, mais um bónus por responderes depressa.
            </AppText>
          </GradientCard>
          {error && (
            <AppText variant="bodyStrong" tone="danger" center>
              {error}
            </AppText>
          )}
          {friends.isPending ? (
            <LoadingState />
          ) : (friends.data?.friends ?? []).length === 0 ? (
            <>
              <EmptyState
                title="Ainda não tens amigos"
                text="Adiciona amigos para os desafiar para um duelo."
              />
              <AppButton variant="secondary" onPress={() => router.push("/friends")}>
                Encontrar amigos
              </AppButton>
            </>
          ) : (
            friends.data!.friends.map((f) => (
              <Card key={f.id} style={styles.row}>
                <Avatar name={f.name} color={f.avatarColor} size={44} />
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {f.name}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    @{f.username} · Nível {f.level}
                  </AppText>
                </View>
                <AppButton
                  size="md"
                  loading={busy === f.id}
                  disabled={s.status !== "ready" || busy !== null}
                  icon={<Swords size={16} color={colors.primaryForeground} />}
                  onPress={() => void challenge(f.id)}
                >
                  Desafiar
                </AppButton>
              </Card>
            ))
          )}
        </ScrollView>
      )}
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
  content: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  waiting: { flex: 1, padding: space.xl, gap: space.xl, justifyContent: "center" },
  vs: { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  side: { alignItems: "center", gap: space.sm },
  unknown: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
});
