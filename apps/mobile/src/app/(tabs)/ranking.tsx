import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Screen, Title } from '@/components/ui';
import { leaderboard } from '@/mocks/data';
import { colors, font, radius, space } from '@/theme/tokens';

const PERIODS = ['Diário', 'Semanal', 'Mensal', 'Global', 'Amigos'] as const;
const MEDALS = ['🥇', '🥈', '🥉'];

export default function Ranking() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>('Semanal');

  return (
    <Screen>
      <Title>Ranking</Title>

      <View style={styles.tabs}>
        {PERIODS.map((p) => (
          <Pressable key={p} onPress={() => setPeriod(p)} style={[styles.tab, period === p && styles.tabActive]}>
            <Text style={[styles.tabText, period === p && { color: '#fff' }]}>{p}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.podium}>
        {[1, 0, 2].map((i) => {
          const p = leaderboard[i];
          return (
            <View key={p.name} style={{ alignItems: 'center', flex: 1 }}>
              <Avatar name={p.name} color={p.color} size={i === 0 ? 64 : 52} />
              <Text style={styles.podiumName}>{p.name}</Text>
              <Text style={styles.podiumXp}>{p.xp.toLocaleString('pt-PT')} XP</Text>
              <View style={[styles.block, { height: i === 0 ? 96 : i === 1 ? 72 : 56 }]}>
                <Text style={{ fontSize: 28 }}>{MEDALS[i]}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ gap: space.sm }}>
        {leaderboard.map((p, i) => (
          <View key={p.name} style={[styles.row, p.isMe && styles.rowMe]}>
            <Text style={styles.pos}>{i < 3 ? MEDALS[i] : i + 1}</Text>
            <Avatar name={p.name} color={p.color} size={38} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{p.name}{p.isMe ? ' (tu)' : ''}</Text>
              <Text style={styles.meta}>Level {p.level}</Text>
            </View>
            <Text style={styles.xp}>{p.xp.toLocaleString('pt-PT')} XP</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tab: {
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontWeight: '800', color: colors.ink, fontSize: font.tiny },
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, marginTop: space.md },
  podiumName: { fontWeight: '800', color: colors.ink, marginTop: 6 },
  podiumXp: { color: colors.muted, fontSize: font.tiny },
  block: {
    marginTop: space.sm,
    alignSelf: 'stretch',
    backgroundColor: colors.sunSoft,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    alignItems: 'center',
    paddingTop: space.sm,
    borderWidth: 2,
    borderColor: colors.sun,
    borderBottomWidth: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    padding: space.md,
  },
  rowMe: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pos: { width: 28, textAlign: 'center', fontWeight: '900', color: colors.muted, fontSize: font.body },
  name: { fontWeight: '800', color: colors.ink },
  meta: { color: colors.muted, fontSize: font.tiny },
  xp: { fontWeight: '900', color: colors.primary },
});
