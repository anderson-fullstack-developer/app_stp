/** Peças visuais da Arena na app (iguais às da web): tempo, contagem, vidas, placar, pergunta. */
import type { ArenaQuestionDto } from "@stp/types/arena";
import { Heart, X } from "lucide-react-native";
import { useEffect } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import {
  AppButton,
  AppText,
  Avatar,
  Card,
  colors,
  haptics,
  radius,
  shadows,
  sound,
  space,
} from "@/design";
import { QuizOption } from "@/features/lesson/QuizOption";
import { useTranslation } from "react-i18next";

/** Barra do tempo da pergunta (fica laranja nos últimos 3 s). */
export function TimerBar({ left, total }: { left: number; total: number }) {
  const { t } = useTranslation();
  const pct = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;
  const urgent = left > 0 && left <= 3;
  return (
    <View
      style={styles.timerTrack}
      accessibilityLabel={t("arena.secondsLeft", { count: Math.ceil(left) })}
    >
      <View
        style={[
          styles.timerFill,
          { width: `${pct * 100}%`, backgroundColor: urgent ? colors.warning : colors.primary },
        ]}
      />
    </View>
  );
}

/** Ecrã por cima com 3, 2, 1, JÁ! (som em cada número). */
export function CountdownOverlay({ value, title }: { value: number | "go"; title?: string }) {
  const { t } = useTranslation();
  useEffect(() => {
    sound.play(value === "go" ? "go" : "tick");
    haptics.tap();
  }, [value]);
  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.countdown}>
        {title ? (
          <AppText variant="h2" tone="inverse" center>
            {title}
          </AppText>
        ) : null}
        <AppText variant="display" tone="inverse" center style={styles.countdownNumber}>
          {value === "go" ? t("arena.go") : value}
        </AppText>
      </View>
    </Modal>
  );
}

export function Lives({ lives, max, size = 22 }: { lives: number; max: number; size?: number }) {
  const { t } = useTranslation();
  return (
    <View style={styles.lives} accessibilityLabel={t("arena.livesOf", { lives, max })}>
      {Array.from({ length: max }, (_, i) => (
        <Heart
          key={i}
          size={size}
          color={i < lives ? colors.destructive : colors.border}
          fill={i < lives ? colors.destructive : "transparent"}
        />
      ))}
    </View>
  );
}

/** Placar de duas partes (eu/a minha equipa vs. o outro lado). */
export function ScoreBar({
  a,
  b,
  labelA,
  labelB,
}: {
  a: number;
  b: number;
  labelA: string;
  labelB: string;
}) {
  return (
    <View style={styles.score}>
      <View style={[styles.scoreSide, { backgroundColor: colors.primary }]}>
        <AppText variant="caption" tone="inverse" numberOfLines={1}>
          {labelA}
        </AppText>
        <AppText variant="h2" tone="inverse">
          {a}
        </AppText>
      </View>
      <View style={[styles.scoreSide, { backgroundColor: colors.destructive }]}>
        <AppText variant="caption" tone="inverse" numberOfLines={1}>
          {labelB}
        </AppText>
        <AppText variant="h2" tone="inverse">
          {b}
        </AppText>
      </View>
    </View>
  );
}

/** Pergunta com as opções; depois da ronda mostra a certa (verde) e a minha errada (vermelho). */
export function QuestionView({
  question,
  selected,
  correctOptionId,
  canAnswer,
  hint,
  onAnswer,
}: {
  question: ArenaQuestionDto;
  selected: string | null;
  correctOptionId: string | null;
  canAnswer: boolean;
  hint: string;
  onAnswer: (optionId: string) => void;
}) {
  return (
    <View style={{ gap: space.md }}>
      <AppText variant="caption" tone="muted" center>
        {hint}
      </AppText>
      <Card style={styles.prompt}>
        <AppText variant="h1" center>
          {question.prompt}
        </AppText>
      </Card>
      <View style={{ gap: space.sm }}>
        {question.options.map((o, i) => (
          <QuizOption
            key={o.id}
            label={o.label}
            letter={"ABCD"[i] ?? ""}
            selected={selected === o.id}
            state={
              correctOptionId === null
                ? "idle"
                : o.id === correctOptionId
                  ? "correct"
                  : o.id === selected
                    ? "wrong"
                    : "idle"
            }
            onPress={() => {
              if (canAnswer) onAnswer(o.id);
            }}
          />
        ))}
      </View>
    </View>
  );
}

/** Fila de jogadores com as vidas (Sobrevivência). */
export function PlayersStrip({
  players,
  maxLives,
}: {
  players: { id: string; name: string; color: string | null; lives: number; isMe: boolean }[];
  maxLives: number;
}) {
  return (
    <View style={styles.strip}>
      {players.map((p) => (
        <View key={p.id} style={[styles.stripItem, p.lives <= 0 && { opacity: 0.35 }]}>
          <Avatar name={p.name} color={p.color} size={36} />
          <AppText variant="caption" numberOfLines={1} style={{ maxWidth: 64 }}>
            {p.isMe ? "Tu" : p.name}
          </AppText>
          <Lives lives={Math.max(0, p.lives)} max={maxLives} size={10} />
        </View>
      ))}
    </View>
  );
}

/** Aviso de convite recebido em tempo real. */
export function InviteBanner({
  name,
  duel,
  onJoin,
  onDismiss,
}: {
  name: string;
  duel: boolean;
  onJoin: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={[styles.invite, shadows.card]}>
      <AppText variant="bodyStrong" style={{ flex: 1, color: colors.accentForeground }}>
        {duel ? t("arena.inviteDuel", { name }) : t("arena.inviteRoom", { name })}
      </AppText>
      <AppButton size="md" onPress={onJoin}>
        {t("arena.join")}
      </AppButton>
      <Pressable accessibilityLabel={t("arena.dismissInvite")} onPress={onDismiss} hitSlop={10}>
        <X size={18} color={colors.accentForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  timerTrack: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.muted,
    overflow: "hidden",
  },
  timerFill: { height: "100%", borderRadius: radius.pill },
  countdown: {
    flex: 1,
    backgroundColor: "rgba(0,82,47,0.92)",
    alignItems: "center",
    justifyContent: "center",
    gap: space.lg,
  },
  countdownNumber: { fontSize: 96, lineHeight: 110 },
  lives: { flexDirection: "row", gap: 3, justifyContent: "center" },
  score: { flexDirection: "row", gap: space.sm },
  scoreSide: {
    flex: 1,
    borderRadius: radius.lg,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    alignItems: "center",
  },
  prompt: { paddingVertical: space.xl, alignItems: "center" },
  strip: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: space.md,
    paddingVertical: space.sm,
  },
  stripItem: { alignItems: "center", gap: 2 },
  invite: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    padding: space.md,
  },
});

/** Etiqueta pequena (ronda, jogadores vivos…). */
export function Chip({ label }: { label: string }) {
  return (
    <View style={chip.box}>
      <AppText variant="caption">{label}</AppText>
    </View>
  );
}

const chip = StyleSheet.create({
  box: {
    borderRadius: radius.pill,
    backgroundColor: colors.muted,
    paddingHorizontal: space.md,
    paddingVertical: 4,
  },
});
