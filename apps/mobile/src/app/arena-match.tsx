import { router } from "expo-router";
import { Coins, Skull, Trophy, Zap } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  AppButton,
  AppText,
  Avatar,
  Card,
  colors,
  haptics,
  LoadingState,
  Neto,
  space,
  StatPill,
  sound,
} from "@/design";
import {
  arena,
  countdownValue,
  rewardNote,
  secondsLeft,
  useArena,
  useConfirmLeaveOnBack,
  useNow,
  useUrgencySound,
} from "@/features/arena/arena";
import { RevealPronunciation } from "@/features/arena/RevealPronunciation";
import {
  Chip,
  CountdownOverlay,
  Lives,
  PlayersStrip,
  QuestionView,
  TimerBar,
} from "@/features/arena/ui";

const KRIOLU = "kabuverdianu";

/** Partida de Sobrevivência (igual à web): tudo vem do servidor; aqui só se mostra. */
export default function ArenaMatch() {
  const { t } = useTranslation();
  const s = useArena();
  const now = useNow();
  const [spectating, setSpectating] = useState(false);
  const m = s.match;
  const room = s.room;
  const me = s.me;
  // Android: o botão voltar pergunta antes de abandonar a partida.
  useConfirmLeaveOnBack(Boolean(m && m.phase !== "finished" && !s.finished), () => {
    void arena.leave();
    router.replace("/play");
  });

  // Som e vibração da minha resposta em cada ronda.
  const myOutcome = m?.reveal && me ? m.reveal.outcomes[me] : undefined;
  useEffect(() => {
    if (m?.phase === "reveal" && myOutcome) {
      sound.play(myOutcome === "correct" ? "correct" : "lifeLost");
      if (myOutcome === "correct") haptics.success();
      else haptics.error();
    } else if (m?.phase === "final") sound.play("final");
  }, [m?.phase, m?.round]); // eslint-disable-line react-hooks/exhaustive-deps

  const left = m ? secondsLeft(m, now) : 0;
  useUrgencySound(left, m?.phase ?? "countdown");

  // Sem partida nem resultado: volta à sala.
  useEffect(() => {
    if (s.status === "ready" && !m && !s.finished) router.replace("/arena");
  }, [s.status, m, s.finished]);

  useEffect(() => {
    if (s.finished && me) sound.play(s.finished.standings[0]?.userId === me ? "victory" : "defeat");
  }, [s.finished, me]);

  if (s.finished && room) return <Result />;
  if (!m || !room) {
    return (
      <SafeAreaView style={styles.page}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  const names = Object.fromEntries(room.members.map((x) => [x.userId, x.name]));
  const colorOf = Object.fromEntries(room.members.map((x) => [x.userId, x.avatarColor]));
  const players = m.players.map((p) => ({
    id: p.userId,
    name: names[p.userId] ?? "?",
    color: colorOf[p.userId] ?? null,
    lives: p.lives,
    isMe: p.userId === me,
  }));
  const mine = m.players.find((p) => p.userId === me);
  const lives = room.config.lives;
  const amAlive = (mine?.lives ?? (m.round === 0 ? lives : 0)) > 0;
  const alive = m.players.filter((p) => p.lives > 0);
  const countdown = countdownValue(m, now);
  const showFeedback = m.phase === "reveal" && myOutcome && now - (m.revealedAt ?? 0) < 1700;
  const eliminated = !amAlive && m.round > 0 && !spectating;

  return (
    <SafeAreaView style={styles.page}>
      {m.question && m.round > 0 ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.top}>
            <Chip label={t("arena.round", { n: m.round })} />
            <Chip label={t("arena.alive", { count: alive.length })} />
            <AppText variant="h3">{Math.ceil(left)}s</AppText>
          </View>
          <TimerBar left={left} total={room.config.seconds} />
          {amAlive && <Lives lives={mine?.lives ?? lives} max={lives} size={26} />}
          <QuestionView
            question={m.question}
            selected={m.selected}
            correctOptionId={m.phase === "question" ? null : (m.reveal?.correctOptionId ?? null)}
            canAnswer={m.phase === "question" && amAlive && !m.selected}
            hint={`${m.question.mode === "meaning" ? t("arena.hintMeaning") : t("arena.hintWord")}${room.languageId === KRIOLU ? t("arena.krioluBeta") : ""}`}
            onAnswer={(id) => void arena.answer(id)}
          />
          {m.phase === "reveal" && <RevealPronunciation reveal={m.reveal} />}
          {m.phase === "question" && m.selected && (
            <AppText variant="small" tone="muted" center>
              {t("arena.answerSent", { done: m.answeredCount, total: alive.length })}
            </AppText>
          )}
          {showFeedback && myOutcome && (
            <Card style={[styles.banner, myOutcome === "correct" ? styles.good : styles.bad]}>
              <AppText variant="h3" center>
                {myOutcome === "correct"
                  ? t("arena.correct")
                  : myOutcome === "wrong"
                    ? t("arena.wrong")
                    : t("arena.timeout")}
              </AppText>
              <AppText variant="small" center>
                {myOutcome === "correct" ? t("arena.stillAlive") : t("arena.lostLife")}
              </AppText>
            </Card>
          )}
          {m.phase === "reveal" && !showFeedback && m.reveal && (
            <Card style={styles.banner}>
              <AppText variant="bodyStrong" center>
                {t("arena.roundSummary", {
                  round: m.reveal.summary.round,
                  correct: m.reveal.summary.correct,
                  failed: m.reveal.summary.wrong + m.reveal.summary.noAnswer,
                })}
              </AppText>
              {m.reveal.summary.voided ? (
                <AppText variant="small" tone="muted" center>
                  {t("arena.voided")}
                </AppText>
              ) : m.reveal.summary.eliminated.length > 0 ? (
                <AppText variant="small" tone="danger" center>
                  {t("arena.eliminatedList", {
                    names: m.reveal.summary.eliminated.map((id) => names[id] ?? "?").join(", "),
                  })}
                </AppText>
              ) : null}
            </Card>
          )}
          {m.phase === "final" && (
            <Card style={[styles.banner, styles.final]}>
              <AppText variant="h2" tone="inverse" center>
                {t("arena.finalBattle")}
              </AppText>
            </Card>
          )}
          {eliminated && !showFeedback && (
            <Card style={[styles.banner, styles.bad]}>
              <Skull size={28} color={colors.destructive} style={{ alignSelf: "center" }} />
              <AppText variant="h3" center>
                {t("arena.eliminatedTitle", { place: mine?.placement ?? players.length })}
              </AppText>
              <AppText variant="small" tone="muted" center>
                {t("arena.eliminatedText", { correct: mine?.correct ?? 0 })}
              </AppText>
              <AppButton size="md" onPress={() => setSpectating(true)}>
                {t("arena.watch")}
              </AppButton>
              <AppButton
                size="md"
                variant="secondary"
                onPress={() => {
                  void arena.leave();
                  router.replace("/play");
                }}
              >
                {t("arena.leave")}
              </AppButton>
            </Card>
          )}
          <PlayersStrip players={players} maxLives={lives} />
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <Neto mood="happy" size={120} />
          <AppText variant="h2" center>
            {t("arena.starting")}
          </AppText>
        </View>
      )}
      {countdown !== null && <CountdownOverlay value={countdown} title={t("arena.roomFull")} />}
    </SafeAreaView>
  );
}

/** Resultado da partida: lugares, a minha recompensa e jogar outra vez. */
function Result() {
  const { t } = useTranslation();
  const s = useArena();
  const f = s.finished!;
  const me = s.me;
  const mine = f.standings.find((x) => x.userId === me);
  const won = mine?.place === 1;
  const note = s.reward ? rewardNote(s.reward.reason) : undefined;
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ alignItems: "center", gap: space.sm }}>
          <Neto mood={won ? "celebrate" : "happy"} size={120} />
          <AppText variant="h1" center>
            {won ? t("arena.youWon") : t("arena.place", { place: mine?.place ?? "?" })}
          </AppText>
          <AppText variant="small" tone="muted" center>
            {mine ? t("arena.resultSummary", { correct: mine.correct, rounds: f.rounds }) : ""}
          </AppText>
        </View>
        <View style={styles.rewardRow}>
          <StatPill
            tone="xp"
            icon={<Zap size={16} color={colors.accentDeep} />}
            value={`+${s.reward?.xp ?? 0} XP`}
          />
          <StatPill
            tone="coins"
            icon={<Coins size={16} color={colors.secondary} />}
            value={`+${s.reward?.coins ?? 0}`}
          />
        </View>
        {note && (
          <AppText variant="small" tone="muted" center>
            {note}
          </AppText>
        )}
        <AppText variant="h3">{t("arena.standings")}</AppText>
        {f.standings.map((x) => (
          <Card key={x.userId} style={[styles.standing, x.userId === me && styles.standingMe]}>
            <AppText variant="h3" style={{ width: 32, textAlign: "center" }}>
              {x.place === 1 ? (
                <Trophy size={20} color={colors.accentDeep} />
              ) : (
                t("arena.placeShort", { place: x.place })
              )}
            </AppText>
            <Avatar name={x.name} color={x.avatarColor} size={36} />
            <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
              {x.userId === me ? t("arena.youCap") : x.name}
            </AppText>
            <AppText variant="caption" tone="muted">
              {x.left ? t("arena.left") : t("arena.correctCount", { count: x.correct })}
            </AppText>
          </Card>
        ))}
        <AppButton
          onPress={() => {
            arena.clearResult();
            router.replace("/arena");
          }}
        >
          {t("arena.playAgainRoom")}
        </AppButton>
        <AppButton
          variant="secondary"
          onPress={() => {
            arena.clearResult();
            router.replace("/arena-history");
          }}
        >
          {t("arena.history")}
        </AppButton>
        <AppButton
          variant="ghost"
          onPress={() => {
            void arena.leave();
            router.replace("/play");
          }}
        >
          {t("arena.backToPlay")}
        </AppButton>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  banner: { gap: space.xs },
  good: { backgroundColor: colors.successSoft, borderColor: colors.success },
  bad: { backgroundColor: colors.destructiveSoft, borderColor: colors.destructive },
  final: { backgroundColor: colors.secondary },
  rewardRow: { flexDirection: "row", justifyContent: "center", gap: space.sm },
  standing: { flexDirection: "row", alignItems: "center", gap: space.md },
  standingMe: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
});
