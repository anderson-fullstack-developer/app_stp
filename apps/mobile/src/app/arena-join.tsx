import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton, AppText, colors, fonts, radius, space } from "@/design";
import { arena, arenaError, useArena } from "@/features/arena/arena";

/** Entrar numa sala com o código de 6 letras (igual à web). */
export default function ArenaJoin() {
  const s = useArena();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const r = await arena.join(code);
    setBusy(false);
    if (r.ok) router.replace("/arena");
    else setError(arenaError(r));
  };

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={24} color={colors.foreground} />
        </Pressable>
        <AppText variant="h3">Entrar com código</AppText>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        <AppText variant="h2" center>
          Código da sala
        </AppText>
        <TextInput
          value={code}
          onChangeText={(v) => {
            setCode(
              v
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, 6),
            );
            setError(null);
          }}
          autoFocus
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          placeholder="______"
          placeholderTextColor={colors.border}
          accessibilityLabel="Código da sala"
          style={[styles.input, error ? { borderColor: colors.destructive } : null]}
        />
        <AppText variant="bodyStrong" tone={error ? "danger" : "muted"} center>
          {error ?? (s.status === "ready" ? "Pede o código ao host da sala." : "A ligar…")}
        </AppText>
        <View style={{ flex: 1 }} />
        <AppButton
          onPress={() => void submit()}
          loading={busy}
          disabled={code.length !== 6 || s.status !== "ready"}
        >
          Entrar
        </AppButton>
      </View>
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
  content: { flex: 1, padding: space.xl, gap: space.lg },
  input: {
    alignSelf: "center",
    width: 260,
    height: 72,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    textAlign: "center",
    fontFamily: fonts.displayHeavy,
    fontSize: 36,
    letterSpacing: 8,
    color: colors.foreground,
  },
});
