import { router } from "expo-router";
import {
  Calendar,
  History,
  KeyRound,
  type LucideIcon,
  Skull,
  Swords,
  Trophy,
  Users,
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppText, colors, type GradientName, GradientCard, haptics, radius, space } from "@/design";
import { arena, useArena } from "@/features/arena/arena";
import { InviteBanner } from "@/features/arena/ui";

function ModeCard({
  Icon,
  title,
  text,
  gradient,
  onPress,
  soon,
}: {
  Icon: LucideIcon;
  title: string;
  text: string;
  gradient: GradientName;
  onPress?: () => void;
  soon?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={soon}
      onPress={() => {
        haptics.tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        { flex: 1, opacity: soon ? 0.55 : 1 },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <GradientCard gradient={gradient} style={styles.mode}>
        <Icon size={28} color="#ffffff" />
        <AppText variant="h3" tone="inverse" style={{ marginTop: space.sm }}>
          {title}
        </AppText>
        <AppText variant="caption" tone="inverse" style={{ opacity: 0.85 }}>
          {soon ? "Em breve" : text}
        </AppText>
      </GradientCard>
    </Pressable>
  );
}

/** Jogar (igual à web): Sobrevivência com amigos, duelo, 2 contra 2, código, histórico. */
export default function PlayTab() {
  const { t } = useTranslation();
  const s = useArena();
  return (
    <SafeAreaView edges={["top"]} style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="h2">{t("nav.play")}</AppText>
        {s.invite && (
          <InviteBanner
            name={s.invite.from.name}
            duel={s.invite.mode === "duel"}
            onJoin={() => {
              const code = s.invite!.code;
              arena.dismissInvite();
              router.push({ pathname: "/arena", params: { code } });
            }}
            onDismiss={arena.dismissInvite}
          />
        )}
        <ModeCard
          Icon={Skull}
          title="Sobrevivência"
          text="Cria uma sala, convida amigos e responde às mesmas perguntas. O último a sobreviver ganha."
          gradient="cocoa"
          onPress={() => router.push("/arena")}
        />
        <View style={styles.row}>
          <ModeCard
            Icon={Swords}
            title="Duelo 1v1"
            text="Desafia um amigo"
            gradient="coral"
            onPress={() => router.push("/duel")}
          />
          <ModeCard
            Icon={Users}
            title="2 contra 2"
            text="Joga em equipa"
            gradient="forest"
            onPress={() => router.push({ pathname: "/arena", params: { mode: "teams" } })}
          />
        </View>
        <View style={styles.row}>
          <ModeCard
            Icon={KeyRound}
            title="Entrar com código"
            text="Recebeste um código?"
            gradient="ocean"
            onPress={() => router.push("/arena-join")}
          />
          <ModeCard
            Icon={Calendar}
            title={t("daily.title")}
            text="5 perguntas por dia"
            gradient="sun"
            onPress={() => router.push("/daily")}
          />
        </View>
        <ModeCard Icon={Trophy} title="Torneios" text="" gradient="ocean" soon />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/arena-history")}
          style={styles.history}
        >
          <History size={18} color={colors.primary} />
          <AppText variant="bodyStrong" tone="primary">
            Ver o meu histórico de partidas
          </AppText>
        </Pressable>
        <AppText variant="caption" tone="muted" center>
          Competição justa: o Premium não dá vidas nem vantagens nas partidas.
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  row: { flexDirection: "row", gap: space.md },
  mode: { borderRadius: radius.xl, minHeight: 120 },
  history: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    paddingVertical: space.sm,
  },
});
