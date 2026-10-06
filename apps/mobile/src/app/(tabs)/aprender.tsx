import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Pill, Screen } from '@/components/ui';
import { me, units, type MockLesson, type MockUnit } from '@/mocks/data';
import { colors, font, radius, space } from '@/theme/tokens';

// Desvio horizontal em zig-zag para o caminho de aprendizagem.
const OFFSETS = [0, 52, 72, 52, 0, -52, -72, -52];

export default function Learn() {
  let index = 0;
  return (
    <Screen>
      <View style={styles.header}>
        <Pill icon="🇸🇹" label="Forro" />
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Pill icon="🔥" label={`${me.streak}`} color={colors.coral} />
          <Pill icon="🪙" label={`${me.coins}`} color={colors.sunDark} />
          <Pill icon="⚡" label={`${me.xp}`} color={colors.primary} />
        </View>
      </View>

      {units.map((unit) => (
        <View key={unit.id} style={{ gap: space.lg }}>
          <UnitHeader unit={unit} />
          <View style={{ alignItems: 'center', gap: space.lg }}>
            {unit.lessons.map((lesson) => (
              <LessonNode key={lesson.id} lesson={lesson} color={unit.color} offset={OFFSETS[index++ % OFFSETS.length]} />
            ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}

function UnitHeader({ unit }: { unit: MockUnit }) {
  const done = unit.lessons.filter((l) => l.state === 'done').length;
  return (
    <View style={[styles.unit, { backgroundColor: unit.color }]}>
      <Text style={styles.unitLabel}>UNIDADE {unit.order}</Text>
      <Text style={styles.unitTitle}>{unit.title}</Text>
      <Text style={styles.unitMeta}>
        {done}/{unit.lessons.length} lições
      </Text>
    </View>
  );
}

function LessonNode({ lesson, color, offset }: { lesson: MockLesson; color: string; offset: number }) {
  const locked = lesson.state === 'locked';
  const current = lesson.state === 'current';
  const bg = locked ? colors.locked : color;
  const icon = lesson.isTest ? '👑' : lesson.state === 'done' ? '✓' : locked ? '🔒' : '★';

  return (
    <View style={{ alignItems: 'center', transform: [{ translateX: offset }] }}>
      {current ? (
        <View style={styles.startBubble}>
          <Text style={styles.startText}>COMEÇAR</Text>
        </View>
      ) : null}
      <Pressable
        disabled={locked}
        onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })}
        style={({ pressed }) => [
          styles.node,
          {
            backgroundColor: bg,
            borderBottomColor: locked ? '#ADA699' : 'rgba(0,0,0,0.25)',
            transform: [{ translateY: pressed ? 3 : 0 }],
          },
          current && styles.nodeCurrent,
        ]}>
        <Text style={[styles.nodeIcon, { color: '#fff' }]}>{icon}</Text>
      </Pressable>
      <Text style={[styles.nodeTitle, locked && { color: colors.muted }]}>{lesson.title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: space.sm },
  unit: { borderRadius: radius.lg, padding: space.lg, borderBottomWidth: 5, borderBottomColor: 'rgba(0,0,0,0.2)' },
  unitLabel: { color: 'rgba(255,255,255,0.8)', fontWeight: '800', fontSize: font.tiny, letterSpacing: 1 },
  unitTitle: { color: '#fff', fontWeight: '900', fontSize: font.h2 },
  unitMeta: { color: 'rgba(255,255,255,0.85)', fontSize: font.small, marginTop: 2 },
  node: {
    width: 76,
    height: 70,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 7,
  },
  nodeCurrent: { borderWidth: 4, borderColor: colors.sun },
  nodeIcon: { fontSize: 30, fontWeight: '900' },
  nodeTitle: { marginTop: 6, fontWeight: '700', color: colors.ink, fontSize: font.tiny },
  startBubble: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    marginBottom: 6,
  },
  startText: { color: colors.primary, fontWeight: '900', fontSize: font.tiny, letterSpacing: 1 },
});
