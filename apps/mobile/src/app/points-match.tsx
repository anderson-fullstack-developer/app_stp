import { MULTIPLAYER_CONFIG } from "@stp/config";
import { router } from "expo-router";
import { Coins, Swords, Zap } from "lucide-react-native";
import { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  AppButton,
  AppText,
  Avatar,
  Card,
  colors,
  LoadingState,
  Neto,
  sound,
  space,
  StatPill,
} from "@/design";
import {
  type ArenaState,
  arena,
  countdownValue,
  rewardNote,
  secondsLeft,
  useArena,
  useConfirmLeaveOnBack,
  useNow,
  useRoundGains,
  useUrgencySound,
} from "@/features/arena/arena";
import { RevealPronunciation } from "@/features/arena/RevealPronunciation";
import { Chip, CountdownOverlay, QuestionView, ScoreBar, TimerBar } from "@/features/arena/ui";

type Team = "A" | "B";
const otherTeam = (t: Team): Team => (t === "A" ? "B" : "A");
const KRIOLU = "kabuverdianu";

/** Partida por pontos (duelo 1v1 e 2 contra 2), igual à web: pontos calculados no servidor. */
export default function PointsMatch() {
  const s = useArena();
  const room = s.room;
  const done = Boolean(s.finished) && (!s.match || s.match.phase === "finished");

  useEffect(() => {
    if (s.status === "ready" && !room && !s.finished) router.replace("/play");
  }, [s.status, room, s.finished]);

  if (done && s.finished) return <PointsResult s={s} />;
  if (!s.match || !room) {
    return (
      <SafeAreaView style={styles.page}>
        <LoadingState />
      </SafeAreaView>
    );
  }
  return <PointsGame s={s} />;
}

function PointsGame({ s }: { s: ArenaState }) {
  const { t } = useTranslation();
  const m = s.match!;
  const room = s.room!;
  // Android: o botão voltar pergunta antes de abandonar a partida.
  useConfirmLeaveOnBack(m.phase !== "finished", () => {
    void arena.leave();
    router.replace("/play");
  });
  const now = useNow();
  const gains = useRoundGains(m, s.me);
  const left = secondsLeft(m, now);
  useUrgencySound(left, m.phase);
  const countdown = countdownValue(m, now);
  const duel = room.mode === "duel";
  const total = duel ? MULTIPLAYER_CONFIG.duel.questions : MULTIPLAYER_CONFIG.teams.questions;

  const name = (id: string) => room.members.find((x) => x.userId === id)?.name ?? "?";
  const myTeam: Team = room.members.find((x) => x.userId === s.me)?.team ?? "A";
  const scoreOf = (id?: string) => m.players.find((p) => p.userId === id)?.score ?? 0;
  const teamScore = (team: Team) =>
    m.players.filter((p) => p.team === team).reduce((n, p) => n + p.score, 0);
  const other = room.members.find((x) => x.userId !== s.me);
  const a = duel ? scoreOf(s.me ?? undefined) : teamScore(myTeam);
  const b = duel ? scoreOf(other?.userId) : teamScore(otherTeam(myTeam));

  return (
    <SafeAreaView style={styles.page}>
      {m.question && m.round > 0 ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.top}>
            <Chip label={`${m.round}/${total}`} />
            <AppText variant="h3">{Math.ceil(left)}s</AppText>
          </View>
          <TimerBar left={left} total={room.config.seconds} />
          <ScoreBar
            a={a}
            b={b}
            labelA={duel ? t("arena.youCap") : t("arena.yourTeam")}
            labelB={
              duel
                ? (other?.name ?? t("arena.opponent"))
                : t("arena.team", { team: otherTeam(myTeam) })
            }
          />
          <QuestionView
            question={m.question}
            selected={m.selected}
            correctOptionId={m.phase === "question" ? null : (m.reveal?.correctOptionId ?? null)}
            canAnswer={m.phase === "question" && !m.selected}
            hint={`${m.question.mode === "meaning" ? t("arena.hintMeaning") : t("arena.hintWord")}${room.languageId === KRIOLU ? t("arena.krioluBeta") : ""}`}
            onAnswer={(id) => void arena.answer(id)}
          />
          {m.phase === "reveal" && <RevealPronunciation reveal={m.reveal} />}
          {m.phase === "question" && m.selected && (
            <AppText variant="small" tone="muted" center>
              {t("arena.answerSent", { done: m.answeredCount, total: m.players.length })}
            </AppText>
          )}
          {m.phase === "reveal" && (
            <Card style={{ gap: 4 }}>
              {m.players.map((p) => (
                <View key={p.userId} style={styles.gainRow}>
                  <AppText variant="bodyStrong" style={{ flex: 1 }}>
                    {p.userId === s.me ? t("arena.youCap") : name(p.userId)}
                    {duel ? "" : t("arena.teamSuffix", { team: p.team })}
                  </AppText>
                  <AppText
                    variant="bodyStrong"
                    tone={(gains[p.userId] ?? 0) > 0 ? "success" : "muted"}
                  >
                    +{gains[p.userId] ?? 0}
                  </AppText>
                </View>
              ))}
            </Card>
          )}
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <Swords size={48} color={colors.primary} />
          <AppText variant="h2" center>
            {duel ? t("arena.versus", { name: other?.name ?? "…" }) : t("arena.teamsVersus")}
          </AppText>
          <AppText variant="small" tone="muted" center>
            {t("arena.questionsInfo", { count: total })}
          </AppText>
        </View>
      )}
      {countdown !== null && <CountdownOverlay value={countdown} />}
    </SafeAreaView>
  );
}

function PointsResult({ s }: { s: ArenaState }) {
  const { t } = useTranslation();
  const f = s.finished!;
  const duel = s.room?.mode === "duel" || (!f.teams && f.standings.length === 2);
  const mine = f.standings.find((x) => x.userId === s.me);
  const myTeam = (mine?.team ?? "A") as Team;
  const theirs = f.standings.find((x) => x.userId !== s.me);
  const draw = duel ? mine?.place === 1 && theirs?.place === 1 : f.winnerTeam === null;
  const won = duel ? mine?.place === 1 && !draw : f.winnerTeam === myTeam;
  const note = s.reward ? rewardNote(s.reward.reason) : undefined;

  useEffect(() => {
    sound.play(won ? "victory" : "defeat");
  }, [won]);

  const again = async () => {
    if (duel && theirs && !theirs.left) {
      const opponent = theirs.userId;
      await arena.leave();
      await arena.challenge(opponent);
      router.replace("/duel");
    } else {
      arena.clearResult();
      router.replace("/arena");
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ alignItems: "center", gap: space.sm }}>
          <Neto mood={won ? "celebrate" : "happy"} size={120} />
          <AppText variant="h1" center>
            {draw
              ? t("arena.draw")
              : won
                ? duel
                  ? t("arena.youWon")
                  : t("arena.teamWon")
                : duel
                  ? t("arena.otherWon", { name: theirs?.name ?? t("arena.opponent") })
                  : t("arena.teamXWon", { team: f.winnerTeam })}
          </AppText>
          {duel && theirs?.left && (
            <AppText variant="small" tone="muted" center>
              {t("arena.opponentLeft", { name: theirs.name })}
            </AppText>
          )}
        </View>
        {!duel && f.teams && (
          <ScoreBar
            a={f.teams[myTeam]}
            b={f.teams[otherTeam(myTeam)]}
            labelA={t("arena.yourTeam")}
            labelB={t("arena.team", { team: otherTeam(myTeam) })}
          />
        )}
        {f.standings.map((x) => (
          <Card key={x.userId} style={[styles.standing, x.userId === s.me && styles.standingMe]}>
            <Avatar name={x.name} color={x.avatarColor} size={36} />
            <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
              {x.userId === s.me ? t("arena.youCap") : x.name}
              {duel ? "" : t("arena.teamSuffix", { team: x.team })}
              {x.left ? t("arena.leftSuffix") : ""}
            </AppText>
            <View style={{ alignItems: "flex-end" }}>
              <AppText variant="h3">{x.score}</AppText>
              <AppText variant="caption" tone="muted">
                {t("arena.correctOf", { correct: x.correct, total: f.rounds })}
              </AppText>
            </View>
          </Card>
        ))}
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
        <AppButton onPress={() => void again()}>
          {duel ? t("arena.challengeAgain") : t("arena.playAgainRoom")}
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.md,
    padding: space.xl,
  },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  gainRow: { flexDirection: "row", alignItems: "center" },
  standing: { flexDirection: "row", alignItems: "center", gap: space.md },
  standingMe: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  rewardRow: { flexDirection: "row", justifyContent: "center", gap: space.sm },
});
