import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, DemoBanner, ProgressBar, Screen } from '@/components/ui';
import { lessonQuestions, me } from '@/mocks/data';
import { colors, font, radius, space } from '@/theme/tokens';

type Phase = 'answering' | 'checked' | 'finished';

export default function Lesson() {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('answering');
  const [correctCount, setCorrectCount] = useState(0);
  const startedAt = useRef(Date.now());

  const q = lessonQuestions[index];
  const isCorrect = selected === q?.correctOptionId;

  const check = () => {
    if (!selected) return;
    if (isCorrect) setCorrectCount((c) => c + 1);
    setPhase('checked');
  };

  const next = () => {
    if (index + 1 >= lessonQuestions.length) {
      setPhase('finished');
      return;
    }
    setIndex(index + 1);
    setSelected(null);
    setPhase('answering');
  };

  if (phase === 'finished') {
    const total = lessonQuestions.length;
    const seconds = Math.round((Date.now() - startedAt.current) / 1000);
    return (
      <LessonResult
        accuracy={Math.round((correctCount / total) * 100)}
        perfect={correctCount === total}
        time={`${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`}
      />
    );
  }

  return (
    <Screen scroll={false}>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <ProgressBar value={(index + (phase === 'checked' ? 1 : 0)) / lessonQuestions.length} />
        </View>
        <Text style={styles.hearts}>❤️ 5</Text>
      </View>

      <DemoBanner />

      <View style={{ flex: 1, gap: space.lg }}>
        <Text style={styles.type}>ESCOLHA MÚLTIPLA</Text>
        <View style={styles.promptRow}>
          <Pressable style={styles.audioBtn}>
            <Text style={{ fontSize: 22 }}>🔊</Text>
          </Pressable>
          <Text style={styles.prompt}>
            {q.prompt} <Text style={{ color: colors.primary }}>{q.term}</Text>?
          </Text>
        </View>

        <View style={{ gap: space.md }}>
          {q.options.map((o, i) => {
            const isSel = selected === o.id;
            const showCorrect = phase === 'checked' && o.id === q.correctOptionId;
            const showWrong = phase === 'checked' && isSel && !isCorrect;
            return (
              <Pressable
                key={o.id}
                disabled={phase !== 'answering'}
                onPress={() => setSelected(o.id)}
                style={[
                  styles.option,
                  isSel && styles.optionSel,
                  showCorrect && styles.optionCorrect,
                  showWrong && styles.optionWrong,
                ]}>
                <View style={styles.key}>
                  <Text style={styles.keyText}>{String.fromCharCode(65 + i)}</Text>
                </View>
                <Text style={styles.optionText}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {phase === 'checked' ? (
        <View style={[styles.feedback, { backgroundColor: isCorrect ? colors.primarySoft : colors.coralSoft }]}>
          <Text style={[styles.feedbackTitle, { color: isCorrect ? colors.primaryDark : colors.coralDark }]}>
            {isCorrect ? '✅ Muito bem!' : '❌ Resposta correta:'}
          </Text>
          {!isCorrect ? (
            <Text style={{ color: colors.coralDark, fontWeight: '700' }}>
              {q.options.find((o) => o.id === q.correctOptionId)?.label}
            </Text>
          ) : null}
          <Button label="Continuar" variant={isCorrect ? 'primary' : 'coral'} onPress={next} />
        </View>
      ) : (
        <Button label="Verificar" onPress={check} disabled={!selected} />
      )}
    </Screen>
  );
}

function LessonResult({ accuracy, perfect, time }: { accuracy: number; perfect: boolean; time: string }) {
  // Valores ilustrativos: no produto final as recompensas são calculadas pelo servidor.
  const xp = 30 + (perfect ? 20 : 0);
  return (
    <Screen scroll={false} style={{ justifyContent: 'space-between' }}>
      <View style={{ alignItems: 'center', gap: space.md, marginTop: space.xxl }}>
        <Text style={{ fontSize: 80 }}>🎉</Text>
        <Text style={styles.doneTitle}>Lição concluída!</Text>
        {perfect ? <Text style={styles.perfect}>LIÇÃO PERFEITA · +20 XP extra</Text> : null}
      </View>

      <View style={styles.resultGrid}>
        <ResultTile color={colors.sun} label="XP" value={`+${xp}`} icon="⚡" />
        <ResultTile color={colors.sunDark} label="MOEDAS" value="+5" icon="🪙" />
        <ResultTile color={colors.primary} label="PRECISÃO" value={`${accuracy}%`} icon="🎯" />
        <ResultTile color={colors.ocean} label="TEMPO" value={time} icon="⏱" />
      </View>

      <View style={styles.streak}>
        <Text style={{ fontSize: 32 }}>🔥</Text>
        <Text style={styles.streakText}>{me.streak + 1} dias seguidos!</Text>
      </View>

      <Button label="Continuar" onPress={() => router.back()} />
    </Screen>
  );
}

function ResultTile({ color, label, value, icon }: { color: string; label: string; value: string; icon: string }) {
  return (
    <View style={[styles.tile, { borderColor: color }]}>
      <View style={[styles.tileHead, { backgroundColor: color }]}>
        <Text style={styles.tileLabel}>{label}</Text>
      </View>
      <Text style={styles.tileValue}>
        {icon} {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  close: { fontSize: 22, color: colors.muted, fontWeight: '800' },
  hearts: { fontWeight: '900', color: colors.coral },
  type: { fontWeight: '900', color: colors.ocean, letterSpacing: 1, fontSize: font.tiny },
  promptRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  audioBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.ocean,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#136F8A',
  },
  prompt: { flex: 1, fontSize: font.h2, fontWeight: '800', color: colors.ink },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
  },
  optionSel: { borderColor: colors.ocean, backgroundColor: colors.oceanSoft },
  optionCorrect: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionWrong: { borderColor: colors.coral, backgroundColor: colors.coralSoft },
  key: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontWeight: '900', color: colors.muted },
  optionText: { fontSize: font.body, fontWeight: '700', color: colors.ink },
  feedback: { borderRadius: radius.lg, padding: space.lg, gap: space.sm, marginHorizontal: -space.sm },
  feedbackTitle: { fontSize: font.h3, fontWeight: '900' },
  doneTitle: { fontSize: 32, fontWeight: '900', color: colors.sunDark },
  perfect: { fontWeight: '900', color: colors.primary, letterSpacing: 0.5 },
  resultGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: { flexBasis: '47%', flexGrow: 1, borderWidth: 2, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface },
  tileHead: { paddingVertical: 4, alignItems: 'center' },
  tileLabel: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  tileValue: { textAlign: 'center', fontWeight: '900', fontSize: font.h3, color: colors.ink, paddingVertical: space.md },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.coralSoft,
    borderRadius: radius.pill,
    padding: space.md,
  },
  streakText: { fontWeight: '900', color: colors.coralDark, fontSize: font.h3 },
});
