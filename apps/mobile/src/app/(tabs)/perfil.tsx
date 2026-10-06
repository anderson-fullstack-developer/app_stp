import { StyleSheet, Text, View } from 'react-native';

import { Avatar, Card, ProgressBar, Screen } from '@/components/ui';
import { achievements, me } from '@/mocks/data';
import { colors, font, radius, space } from '@/theme/tokens';

export default function Profile() {
  const levelProgress = (me.xp - me.levelStartXp) / (me.nextLevelXp - me.levelStartXp);

  return (
    <Screen>
      <View style={styles.hero}>
        <Avatar name={me.name} size={88} color={colors.primary} />
        <Text style={styles.name}>{me.name}</Text>
        <Text style={styles.username}>@{me.username} · desde {me.joined}</Text>
        <Text style={styles.username}>🇸🇹 A aprender {me.learning}</Text>
      </View>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.levelLabel}>Level {me.level}</Text>
          <Text style={styles.levelXp}>
            {me.xp} / {me.nextLevelXp} XP
          </Text>
        </View>
        <ProgressBar value={levelProgress} color={colors.sun} />
      </Card>

      <View style={styles.grid}>
        <Stat icon="🔥" value={me.streak} label="Streak" />
        <Stat icon="🌋" value={me.longestStreak} label="Maior streak" />
        <Stat icon="⚡" value={me.xp} label="XP total" />
        <Stat icon="📘" value={me.lessonsDone} label="Lições" />
        <Stat icon="💬" value={me.wordsLearned} label="Palavras" />
        <Stat icon="🎯" value={`${me.accuracy}%`} label="Precisão" />
        <Stat icon="🏆" value={me.wins} label="Vitórias" />
        <Stat icon="💀" value={me.losses} label="Derrotas" />
        <Stat icon="🏟️" value={me.tournamentsWon} label="Torneios" />
      </View>

      <Text style={styles.section}>CONQUISTAS</Text>
      <View style={styles.grid}>
        {achievements.map((a) => (
          <View key={a.title} style={[styles.badge, !a.unlocked && { opacity: 0.35 }]}>
            <Text style={{ fontSize: 30 }}>{a.icon}</Text>
            <Text style={styles.badgeText}>{a.title}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

function Stat({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 4 },
  name: { fontSize: font.h2, fontWeight: '900', color: colors.ink, marginTop: space.sm },
  username: { color: colors.muted, fontSize: font.small },
  levelLabel: { fontWeight: '900', color: colors.ink, fontSize: font.h3 },
  levelXp: { color: colors.muted, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  stat: {
    flexBasis: '31%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    alignItems: 'center',
  },
  statValue: { fontWeight: '900', fontSize: font.h3, color: colors.ink },
  statLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  section: { fontWeight: '900', color: colors.muted, fontSize: font.tiny, letterSpacing: 1 },
  badge: {
    flexBasis: '22%',
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: space.sm,
    gap: 4,
  },
  badgeText: { fontSize: 10, textAlign: 'center', fontWeight: '700', color: colors.ink },
});
