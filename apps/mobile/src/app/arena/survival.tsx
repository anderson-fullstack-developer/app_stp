import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  applySuddenDeath,
  botAccuracy,
  createPlayer,
  defaultSurvivalConfig as config,
  finishByMaxRounds,
  makeBot,
  nextQuestion,
  resolveRound,
  rewardFor,
  type Player,
  type Question,
  type RoundSummary,
} from '@/arena/engine';
import { Avatar, Button, Hearts, Screen } from '@/components/ui';
import { colors, font, radius, space } from '@/theme/tokens';

type Phase = 'searching' | 'full' | 'countdown' | 'round' | 'result' | 'finished';

const ME_ID = 'me';
const OPTION_COLORS = [colors.coral, colors.ocean, colors.sunDark, colors.primary];

export default function SurvivalScreen() {
  const [phase, setPhase] = useState<Phase>('searching');
  const [players, setPlayers] = useState<Player[]>([]);
  const [countdown, setCountdown] = useState(3);
  const [round, setRound] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [myAnswer, setMyAnswer] = useState<string | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [summary, setSummary] = useState<RoundSummary | null>(null);
  const [showEliminated, setShowEliminated] = useState(false);

  const answersRef = useRef<Record<string, string | undefined>>({});
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const resolvedRef = useRef(false);
  const playersRef = useRef<Player[]>([]);
  playersRef.current = players;

  const later = (fn: () => void, ms: number) => {
    timeouts.current.push(setTimeout(fn, ms));
  };
  const clearAll = () => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  };
  useEffect(() => clearAll, []);

  const me = players.find((p) => p.isMe);
  const alive = players.filter((p) => p.status === 'ALIVE');

  // ---------- MATCHMAKING ----------
  const startSearch = useCallback(() => {
    clearAll();
    setPlayers([createPlayer(ME_ID, 'Tu', colors.primary, true, config)]);
    setRound(0);
    setSummary(null);
    setShowEliminated(false);
    setPhase('searching');
  }, []);

  useEffect(() => {
    startSearch();
  }, [startSearch]);

  useEffect(() => {
    if (phase !== 'searching') return;
    if (players.length >= config.maxPlayers) {
      // Sala cheia: bloqueia entradas e arranca automaticamente.
      setPhase('full');
      later(() => {
        setCountdown(3);
        setPhase('countdown');
      }, 2200);
      return;
    }
    if (players.length === 0) return;
    const t = setTimeout(
      () => setPlayers((ps) => (ps.length < config.maxPlayers ? [...ps, makeBot(ps.length - 1, config)] : ps)),
      350 + Math.random() * 700,
    );
    return () => clearTimeout(t);
  }, [phase, players.length]);

  // ---------- COUNTDOWN ----------
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      startRound(1);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, countdown]);

  // ---------- RONDAS ----------
  const startRound = (n: number) => {
    clearAll();
    let current = playersRef.current;
    if (n === config.suddenDeathFromRound) {
      current = applySuddenDeath(current);
      setPlayers(current);
    }
    const q = nextQuestion(n, config);
    const dl = Date.now() + config.questionDurationSeconds * 1000;
    answersRef.current = {};
    resolvedRef.current = false;
    setRound(n);
    setQuestion(q);
    setDeadline(dl);
    setNow(Date.now());
    setMyAnswer(null);
    setAnsweredCount(0);
    setSummary(null);
    setPhase('round');

    // Bots respondem em instantes aleatórios.
    const acc = botAccuracy(q.difficulty);
    for (const p of current) {
      if (p.isMe || p.status !== 'ALIVE') continue;
      if (Math.random() < 0.06) continue; // não responde a tempo
      const correct = Math.random() < acc;
      const wrongOpts = q.options.filter((o) => o.id !== q.correctOptionId);
      const pick = correct ? q.correctOptionId : wrongOpts[Math.floor(Math.random() * wrongOpts.length)].id;
      later(() => {
        if (resolvedRef.current) return;
        answersRef.current[p.id] = pick;
        setAnsweredCount((c) => c + 1);
      }, 1200 + Math.random() * (config.questionDurationSeconds * 1000 - 1800));
    }
  };

  useEffect(() => {
    if (phase !== 'round') return;
    const i = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(i);
  }, [phase]);

  const endRound = useCallback(() => {
    if (resolvedRef.current || !question) return;
    resolvedRef.current = true;
    clearAll();
    const meBefore = playersRef.current.find((p) => p.isMe);
    const res = resolveRound(playersRef.current, question, answersRef.current);
    let nextPlayers = res.players;
    let finished = res.finished;
    if (!finished && round >= config.maxRounds) {
      nextPlayers = finishByMaxRounds(nextPlayers);
      finished = true;
    }
    setPlayers(nextPlayers);
    setSummary(res.summary);
    setPhase('result');
    if (meBefore?.status === 'ALIVE' && res.summary.eliminated.includes(ME_ID)) setShowEliminated(true);

    later(() => {
      if (finished) setPhase('finished');
      else startRound(round + 1);
    }, config.roundResultMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, round]);

  useEffect(() => {
    if (phase !== 'round') return;
    const aliveCount = playersRef.current.filter((p) => p.status === 'ALIVE').length;
    if (now >= deadline || answeredCount >= aliveCount) endRound();
  }, [phase, now, deadline, answeredCount, endRound]);

  const submit = (optionId: string) => {
    // Validações que o servidor também fará: jogador vivo, ronda ativa, dentro do tempo, 1 resposta.
    if (phase !== 'round' || myAnswer || me?.status !== 'ALIVE' || Date.now() >= deadline) return;
    answersRef.current[ME_ID] = optionId;
    setMyAnswer(optionId);
    setAnsweredCount((c) => c + 1);
  };

  const leave = () => {
    clearAll();
    router.back();
  };

  // ---------- RENDER ----------
  if (phase === 'searching' || phase === 'full') {
    return <Matchmaking players={players} full={phase === 'full'} onCancel={leave} />;
  }
  if (phase === 'countdown') return <Countdown value={countdown} />;
  if (phase === 'finished') {
    return <FinalResults players={players} onAgain={startSearch} onBack={leave} />;
  }
  if (!question || !me) return null;

  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
  const spectator = me.status !== 'ALIVE';
  const isFinal = alive.length === 2;

  return (
    <Screen dark scroll={false} style={{ gap: space.md }}>
      <View style={styles.hud}>
        <Text style={styles.hudRound}>ROUND {round}</Text>
        <View style={[styles.timer, remaining <= 3 && phase === 'round' && { backgroundColor: colors.coral }]}>
          <Text style={styles.timerText}>⏱ {String(phase === 'round' ? remaining : 0).padStart(2, '0')}</Text>
        </View>
        <Text style={styles.hudAlive}>👤 {alive.length} vivos</Text>
      </View>

      <View style={styles.timeBar}>
        <View
          style={{
            height: '100%',
            width: `${phase === 'round' ? (Math.max(0, deadline - now) / (config.questionDurationSeconds * 1000)) * 100 : 0}%`,
            backgroundColor: remaining <= 3 ? colors.coral : colors.sun,
            borderRadius: radius.pill,
          }}
        />
      </View>

      <View style={styles.meRow}>
        {spectator ? (
          <Text style={styles.spectator}>👁 MODO ESPECTADOR</Text>
        ) : (
          <Hearts lives={me.lives} max={config.startingLives} size={22} />
        )}
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {round >= config.suddenDeathFromRound ? <Text style={styles.chipCoral}>MORTE SÚBITA</Text> : null}
          {isFinal ? <Text style={styles.chipCoral}>⚔️ FINAL</Text> : null}
          <Text style={styles.chip}>{question.difficulty}</Text>
        </View>
      </View>

      <View style={styles.questionCard}>
        <Text style={styles.questionText}>{question.prompt}</Text>
        <Text style={styles.demoNote}>Pergunta de demonstração · conteúdo real virá da base de dados (APPROVED)</Text>
      </View>

      <View style={styles.options}>
        {question.options.map((o, i) => {
          const chosen = myAnswer === o.id;
          const reveal = phase === 'result';
          const isRight = reveal && o.id === summary?.correctOptionId;
          const isWrongPick = reveal && chosen && !isRight;
          const dim = (myAnswer && !chosen && !reveal) || (reveal && !isRight && !chosen);
          return (
            <Pressable
              key={o.id}
              disabled={spectator || !!myAnswer || phase !== 'round'}
              onPress={() => submit(o.id)}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: OPTION_COLORS[i], opacity: dim ? 0.35 : 1 },
                chosen && styles.optionChosen,
                isRight && { backgroundColor: colors.primary, borderColor: '#fff', borderWidth: 3 },
                isWrongPick && { backgroundColor: colors.coralDark },
                pressed && { transform: [{ scale: 0.97 }] },
              ]}>
              <Text style={styles.optionKey}>{String.fromCharCode(65 + i)}</Text>
              <Text style={styles.optionLabel}>{o.label}</Text>
              {isRight ? <Text style={styles.optionMark}>✓</Text> : null}
              {isWrongPick ? <Text style={styles.optionMark}>✕</Text> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={{ minHeight: 64, justifyContent: 'center' }}>
        {phase === 'round' ? (
          <Text style={styles.status}>
            {spectator ? 'A assistir…' : myAnswer ? 'Resposta enviada ✓' : 'Escolhe uma opção'} · {answeredCount}/{alive.length} responderam
          </Text>
        ) : summary ? (
          <RoundBanner summary={summary} me={me} answered={myAnswer} aliveCount={alive.length} />
        ) : null}
      </View>

      <PlayerStrip players={players} />

      {showEliminated ? (
        <EliminatedOverlay
          placement={me.placement ?? 0}
          onWatch={() => setShowEliminated(false)}
          onLeave={leave}
        />
      ) : null}
    </Screen>
  );
}

// ---------- Sub-componentes ----------

function Matchmaking({ players, full, onCancel }: { players: Player[]; full: boolean; onCancel: () => void }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Screen dark scroll={false} style={{ justifyContent: 'space-between' }}>
      <View>
        <Text style={styles.kicker}>⚡ ARENA ONLINE · SOBREVIVÊNCIA</Text>
        <Text style={styles.mmRules}>
          {config.maxPlayers} jogadores · {config.startingLives} vidas · {config.questionDurationSeconds}s por pergunta
        </Text>
      </View>

      <View style={{ alignItems: 'center', gap: space.lg }}>
        <Animated.View style={[styles.radar, { transform: [{ scale: full ? 1 : pulse }] }, full && { borderColor: colors.primary }]}>
          <Text style={{ fontSize: 56 }}>{full ? '✅' : '📡'}</Text>
        </Animated.View>
        <Text style={styles.mmTitle}>{full ? 'Sala completa!' : 'À procura de jogadores…'}</Text>
        <Text style={styles.mmCount}>
          {players.length}/{config.maxPlayers} jogadores
        </Text>
        <View style={styles.slots}>
          {Array.from({ length: config.maxPlayers }).map((_, i) => {
            const p = players[i];
            return (
              <View key={i} style={[styles.slot, p && { borderColor: p.color, borderStyle: 'solid' }]}>
                {p ? <Avatar name={p.name} color={p.color} size={44} /> : <Text style={{ color: colors.arenaMuted }}>?</Text>}
                <Text style={styles.slotName} numberOfLines={1}>
                  {p ? p.name : ''}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <Button label={full ? 'A começar…' : 'Cancelar'} variant="outline" onPress={onCancel} disabled={full} />
    </Screen>
  );
}

function Countdown({ value }: { value: number }) {
  const scale = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    scale.setValue(0.4);
    Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, [value, scale]);
  return (
    <Screen dark scroll={false} style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={styles.kicker}>A PARTIDA VAI COMEÇAR</Text>
      <Animated.Text style={[styles.countdown, { transform: [{ scale }] }]}>{value > 0 ? value : 'JÁ!'}</Animated.Text>
    </Screen>
  );
}

function RoundBanner({
  summary,
  me,
  answered,
  aliveCount,
}: {
  summary: RoundSummary;
  me: Player;
  answered: string | null;
  aliveCount: number;
}) {
  const wasAlive = me.status === 'ALIVE' || summary.eliminated.includes(me.id);
  let headline = '';
  let color: string = colors.arenaInk;
  if (wasAlive) {
    if (answered === summary.correctOptionId) {
      headline = '✅ Correto!';
      color = colors.primary;
    } else if (summary.everyoneFailed) {
      headline = '😮 Todos falharam — ninguém perde vida';
      color = colors.sun;
    } else {
      headline = answered ? '❌ Errado  -1 ❤️' : '⏰ Sem resposta  -1 ❤️';
      color = colors.coral;
    }
  }
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      {headline ? <Text style={[styles.bannerTitle, { color }]}>{headline}</Text> : null}
      <Text style={styles.bannerStats}>
        {summary.correct} acertaram · {summary.wrong} erraram · {summary.missed} sem resposta
      </Text>
      <Text style={styles.bannerAlive}>
        {aliveCount <= 1 ? '🏆 TEMOS UM SOBREVIVENTE' : aliveCount === 2 ? '⚔️ FINAL: 2 JOGADORES' : `🔥 ${aliveCount} JOGADORES RESTANTES`}
      </Text>
    </View>
  );
}

function PlayerStrip({ players }: { players: Player[] }) {
  const sorted = [...players].sort(
    (a, b) => (a.status === b.status ? b.lives - a.lives : a.status === 'ALIVE' ? -1 : 1),
  );
  return (
    <View style={styles.strip}>
      {sorted.map((p) => (
        <View key={p.id} style={[styles.stripItem, p.status !== 'ALIVE' && { opacity: 0.35 }, p.isMe && styles.stripMe]}>
          <Text style={styles.stripName} numberOfLines={1}>
            {p.name}
          </Text>
          <Text style={{ fontSize: 10 }}>{p.status === 'ALIVE' ? '❤️'.repeat(p.lives) : '💀'}</Text>
        </View>
      ))}
    </View>
  );
}

function EliminatedOverlay({ placement, onWatch, onLeave }: { placement: number; onWatch: () => void; onLeave: () => void }) {
  return (
    <View style={styles.overlay}>
      <View style={styles.overlayCard}>
        <Text style={{ fontSize: 64 }}>💀</Text>
        <Text style={styles.overlayTitle}>ELIMINADO</Text>
        <Text style={styles.overlayText}>Ficaste em {placement}.º lugar</Text>
        <Button label="Continuar a assistir" variant="sun" onPress={onWatch} style={{ alignSelf: 'stretch' }} />
        <Button label="Sair" variant="ghost" onPress={onLeave} />
      </View>
    </View>
  );
}

function FinalResults({ players, onAgain, onBack }: { players: Player[]; onAgain: () => void; onBack: () => void }) {
  const ranked = [...players].sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99));
  const me = players.find((p) => p.isMe)!;
  const reward = rewardFor(me.placement ?? players.length);
  const winner = ranked[0];
  const medal = (n: number) => (n === 1 ? '🏆' : n === 2 ? '🥈' : n === 3 ? '🥉' : `${n}.º`);

  return (
    <Screen dark>
      <View style={{ alignItems: 'center', gap: space.xs }}>
        <Text style={styles.kicker}>RESULTADOS</Text>
        <Text style={{ fontSize: 56 }}>{me.placement === 1 ? '🏆' : '🎖️'}</Text>
        <Text style={styles.finalTitle}>
          {me.placement === 1 ? 'ÚLTIMO SOBREVIVENTE!' : `Ficaste em ${me.placement}.º!`}
        </Text>
        {me.placement !== 1 ? <Text style={styles.mmRules}>Vencedor: {winner.name}</Text> : null}
      </View>

      <View style={styles.rewardRow}>
        <View style={styles.rewardBox}>
          <Text style={styles.rewardValue}>+{reward.xp}</Text>
          <Text style={styles.rewardLabel}>XP</Text>
        </View>
        <View style={styles.rewardBox}>
          <Text style={styles.rewardValue}>+{reward.coins}</Text>
          <Text style={styles.rewardLabel}>MOEDAS</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.statItem}>✅ {me.correct} corretas</Text>
        <Text style={styles.statItem}>❌ {me.wrong + me.missed} erradas</Text>
        <Text style={styles.statItem}>🔥 {me.bestStreak} seguidas</Text>
      </View>

      <View style={{ gap: space.sm }}>
        {ranked.map((p) => (
          <View key={p.id} style={[styles.rankRow, p.isMe && { borderColor: colors.sun }]}>
            <Text style={styles.rankPos}>{medal(p.placement ?? 0)}</Text>
            <Avatar name={p.name} color={p.color} size={32} />
            <Text style={styles.rankName}>{p.name}</Text>
            <Text style={styles.rankMeta}>{p.correct} ✓</Text>
          </View>
        ))}
      </View>

      <Button label="Jogar novamente" variant="coral" onPress={onAgain} />
      <Button label="Voltar" variant="outline" onPress={onBack} />
      <Text style={styles.demoNote}>Simulação local com bots. Na versão final as recompensas são calculadas pelo servidor.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { color: colors.sun, fontWeight: '900', letterSpacing: 1.5, fontSize: font.tiny, textAlign: 'center' },
  mmRules: { color: colors.arenaMuted, textAlign: 'center', marginTop: 6 },
  radar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: colors.sun,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.arenaSurface,
  },
  mmTitle: { color: colors.arenaInk, fontSize: font.h2, fontWeight: '900' },
  mmCount: { color: colors.sun, fontSize: font.h3, fontWeight: '900' },
  slots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.md, maxWidth: 320 },
  slot: {
    width: 64,
    height: 74,
    borderRadius: radius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.arenaBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  slotName: { color: colors.arenaInk, fontSize: 10, fontWeight: '700' },
  countdown: { color: colors.sun, fontSize: 140, fontWeight: '900' },
  hud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hudRound: { color: colors.arenaInk, fontWeight: '900', fontSize: font.body, letterSpacing: 1 },
  hudAlive: { color: colors.arenaInk, fontWeight: '800' },
  timer: { backgroundColor: colors.arenaSurface, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 6 },
  timerText: { color: colors.arenaInk, fontWeight: '900', fontSize: font.h3 },
  timeBar: { height: 8, backgroundColor: colors.arenaSurface, borderRadius: radius.pill, overflow: 'hidden' },
  meRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  spectator: { color: colors.arenaMuted, fontWeight: '900', letterSpacing: 1 },
  chip: {
    color: colors.arenaMuted,
    borderWidth: 1,
    borderColor: colors.arenaBorder,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: '900',
  },
  chipCoral: {
    color: '#fff',
    backgroundColor: colors.coral,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: '900',
  },
  questionCard: { backgroundColor: colors.arenaSurface, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  questionText: { color: colors.arenaInk, fontSize: font.h2, fontWeight: '800', textAlign: 'center' },
  demoNote: { color: colors.arenaMuted, fontSize: 10, textAlign: 'center' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  option: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 84,
    borderRadius: radius.md,
    padding: space.md,
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
    borderBottomWidth: 6,
    borderBottomColor: 'rgba(0,0,0,0.3)',
  },
  optionChosen: { borderColor: '#fff' },
  optionKey: { color: 'rgba(255,255,255,0.75)', fontWeight: '900', fontSize: font.tiny },
  optionLabel: { color: '#fff', fontWeight: '800', fontSize: font.body },
  optionMark: { position: 'absolute', right: 10, top: 8, color: '#fff', fontSize: 20, fontWeight: '900' },
  status: { color: colors.arenaMuted, textAlign: 'center', fontWeight: '700' },
  bannerTitle: { fontSize: font.h3, fontWeight: '900' },
  bannerStats: { color: colors.arenaMuted, fontSize: font.tiny },
  bannerAlive: { color: colors.sun, fontWeight: '900', letterSpacing: 1, fontSize: font.small },
  strip: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 'auto' },
  stripItem: {
    backgroundColor: colors.arenaSurface,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    minWidth: 70,
    borderWidth: 1,
    borderColor: colors.arenaBorder,
  },
  stripMe: { borderColor: colors.sun },
  stripName: { color: colors.arenaInk, fontSize: 11, fontWeight: '800' },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(5,10,8,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  overlayCard: {
    backgroundColor: colors.arenaSurface,
    borderRadius: radius.xl,
    padding: space.xl,
    alignItems: 'center',
    gap: space.md,
    alignSelf: 'stretch',
    borderWidth: 2,
    borderColor: colors.coral,
  },
  overlayTitle: { color: colors.coral, fontSize: 32, fontWeight: '900', letterSpacing: 2 },
  overlayText: { color: colors.arenaInk, fontSize: font.h3, fontWeight: '700' },
  finalTitle: { color: colors.arenaInk, fontSize: font.h1, fontWeight: '900', textAlign: 'center' },
  rewardRow: { flexDirection: 'row', gap: space.md },
  rewardBox: { flex: 1, backgroundColor: colors.arenaSurface, borderRadius: radius.lg, padding: space.lg, alignItems: 'center' },
  rewardValue: { color: colors.sun, fontSize: font.h1, fontWeight: '900' },
  rewardLabel: { color: colors.arenaMuted, fontWeight: '900', fontSize: font.tiny, letterSpacing: 1 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { color: colors.arenaInk, fontWeight: '700', fontSize: font.small },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.arenaSurface,
    borderRadius: radius.md,
    padding: space.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rankPos: { width: 34, textAlign: 'center', color: colors.arenaInk, fontWeight: '900', fontSize: font.body },
  rankName: { flex: 1, color: colors.arenaInk, fontWeight: '800' },
  rankMeta: { color: colors.arenaMuted, fontWeight: '700' },
});
