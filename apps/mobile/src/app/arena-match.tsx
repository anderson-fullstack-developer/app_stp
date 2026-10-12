import { router } from "expo-router";
import { Coins, Skull, Trophy, Zap } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  REWARD_NOTE,
  secondsLeft,
  useArena,
  useNow,
  useUrgencySound,
} from "@/features/arena/arena";
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
  const s = useArena();
  const now = useNow();
  const [spectating, setSpectating] = useState(false);
  const m = s.match;
  const room = s.room;
  const me = s.me;

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
            <Chip label={`Ronda ${m.round}`} />
            <Chip label={`${alive.length} vivos`} />
            <AppText variant="h3">{Math.ceil(left)}s</AppText>
          </View>
          <TimerBar left={left} total={room.config.seconds} />
          {amAlive && <Lives lives={mine?.lives ?? lives} max={lives} size={26} />}
          <QuestionView
            question={m.question}
            selected={m.selected}
            correctOptionId={m.phase === "question" ? null : (m.reveal?.correctOptionId ?? null)}
            canAnswer={m.phase === "question" && amAlive && !m.selected}
            hint={`${m.question.mode === "meaning" ? "O que significa?" : "Como se diz?"}${room.languageId === KRIOLU ? " · Kriolu (Beta)" : ""}`}
            onAnswer={(id) => void arena.answer(id)}
          />
          {m.phase === "question" && m.selected && (
            <AppText variant="small" tone="muted" center>
              Resposta enviada · {m.answeredCount}/{alive.length} já responderam
            </AppText>
          )}
          {showFeedback && myOutcome && (
            <Card style={[styles.banner, myOutcome === "correct" ? styles.good : styles.bad]}>
              <AppText variant="h3" center>
                {myOutcome === "correct"
                  ? "✅ Correto"
                  : myOutcome === "wrong"
                    ? "❌ Errado"
                    : "⏱️ Sem resposta"}
              </AppText>
              <AppText variant="small" center>
                {myOutcome === "correct" ? "Continuas vivo!" : `Perdeste uma vida.`}
              </AppText>
            </Card>
          )}
          {m.phase === "reveal" && !showFeedback && m.reveal && (
            <Card style={styles.banner}>
              <AppText variant="bodyStrong" center>
                Ronda {m.reveal.summary.round}: {m.reveal.summary.correct} certas ·{" "}
                {m.reveal.summary.wrong + m.reveal.summary.noAnswer} falharam
              </AppText>
              {m.reveal.summary.voided ? (
                <AppText variant="small" tone="muted" center>
                  Toda a gente ia ser eliminada: ronda anulada, ninguém perde vidas.
                </AppText>
              ) : m.reveal.summary.eliminated.length > 0 ? (
                <AppText variant="small" tone="danger" center>
                  Eliminados: {m.reveal.summary.eliminated.map((id) => names[id] ?? "?").join(", ")}
                </AppText>
              ) : null}
            </Card>
          )}
          {m.phase === "final" && (
            <Card style={[styles.banner, styles.final]}>
              <AppText variant="h2" tone="inverse" center>
                ⚔️ Batalha final!
              </AppText>
            </Card>
          )}
          {eliminated && !showFeedback && (
            <Card style={[styles.banner, styles.bad]}>
              <Skull size={28} color={colors.destructive} style={{ alignSelf: "center" }} />
              <AppText variant="h3" center>
                Foste eliminado — {mine?.placement ?? players.length}.º lugar
              </AppText>
              <AppText variant="small" tone="muted" center>
                {mine?.correct ?? 0} certas. Podes ver até ao fim ou sair (sem perderes o lugar).
              </AppText>
              <AppButton size="md" onPress={() => setSpectating(true)}>
                Ver até ao fim
              </AppButton>
              <AppButton
                size="md"
                variant="secondary"
                onPress={() => {
                  void arena.leave();
                  router.replace("/play");
                }}
              >
                Sair
              </AppButton>
            </Card>
          )}
          <PlayersStrip players={players} maxLives={lives} />
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <Neto mood="happy" size={120} />
          <AppText variant="h2" center>
            A partida vai começar!
          </AppText>
        </View>
      )}
      {countdown !== null && <CountdownOverlay value={countdown} title="Sala completa!" />}
    </SafeAreaView>
  );
}

/** Resultado da partida: lugares, a minha recompensa e jogar outra vez. */
function Result() {
  const s = useArena();
  const f = s.finished!;
  const me = s.me;
  const mine = f.standings.find((x) => x.userId === me);
  const won = mine?.place === 1;
  const note = s.reward ? REWARD_NOTE[s.reward.reason] : undefined;
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ alignItems: "center", gap: space.sm }}>
          <Neto mood={won ? "celebrate" : "happy"} size={120} />
          <AppText variant="h1" center>
            {won ? "Ganhaste! 🏆" : `${mine?.place ?? "?"}.º lugar`}
          </AppText>
          <AppText variant="small" tone="muted" center>
            {mine ? `${mine.correct} certas · ${f.rounds} rondas` : ""}
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
        <AppText variant="h3">Classificação</AppText>
        {f.standings.map((x) => (
          <Card key={x.userId} style={[styles.standing, x.userId === me && styles.standingMe]}>
            <AppText variant="h3" style={{ width: 32, textAlign: "center" }}>
              {x.place === 1 ? <Trophy size={20} color={colors.accentDeep} /> : `${x.place}.º`}
            </AppText>
            <Avatar name={x.name} color={x.avatarColor} size={36} />
            <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
              {x.userId === me ? "Tu" : x.name}
            </AppText>
            <AppText variant="caption" tone="muted">
              {x.left ? "saiu" : `${x.correct} certas`}
            </AppText>
          </Card>
        ))}
        <AppButton
          onPress={() => {
            arena.clearResult();
            router.replace("/arena");
          }}
        >
          Jogar outra vez (mesma sala)
        </AppButton>
        <AppButton
          variant="secondary"
          onPress={() => {
            arena.clearResult();
            router.replace("/arena-history");
          }}
        >
          Histórico de partidas
        </AppButton>
        <AppButton
          variant="ghost"
          onPress={() => {
            void arena.leave();
            router.replace("/play");
          }}
        >
          Voltar a Jogar
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
