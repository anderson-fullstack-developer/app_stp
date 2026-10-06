import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Screen, Subtitle, Title } from '@/components/ui';
import { colors, font, radius, space } from '@/theme/tokens';

export default function Challenges() {
  return (
    <Screen>
      <Title>Jogar</Title>

      <Card style={{ backgroundColor: colors.sunSoft, borderColor: colors.sun }}>
        <Text style={styles.kicker}>DESAFIO DO DIA</Text>
        <Text style={styles.cardTitle}>5 perguntas · termina em 14h</Text>
        <Text style={styles.reward}>+50 XP · +10 🪙</Text>
        <Button label="Jogar desafio" variant="sun" onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: 'daily' } })} />
      </Card>

      <Pressable onPress={() => router.push('/arena/survival')} style={({ pressed }) => [styles.arena, pressed && { opacity: 0.9 }]}>
        <Text style={styles.arenaKicker}>⚡ ARENA ONLINE</Text>
        <Text style={styles.arenaTitle}>Sobrevivência</Text>
        <Text style={styles.arenaText}>8 jogadores · 3 vidas · o último vivo ganha</Text>
        <View style={styles.arenaHearts}>
          <Text style={{ fontSize: 22 }}>❤️❤️❤️</Text>
          <View style={styles.arenaCta}>
            <Text style={styles.arenaCtaText}>PROCURAR PARTIDA</Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.grid}>
        <ModeTile icon="⚔️" title="Duelo 1 vs 1" text="Desafia um amigo" soon />
        <ModeTile icon="🔑" title="Sala privada" text="Joga com código" soon />
        <ModeTile icon="👥" title="2 vs 2" text="Em equipa" soon />
        <ModeTile icon="🏟️" title="Torneios" text="Fins de semana" soon />
      </View>

      <Subtitle style={{ textAlign: 'center', fontSize: font.tiny }}>
        Os modos marcados como “Em breve” pertencem às fases 2 e 3 do roadmap.
      </Subtitle>
    </Screen>
  );
}

function ModeTile({ icon, title, text, soon }: { icon: string; title: string; text: string; soon?: boolean }) {
  return (
    <View style={styles.tile}>
      <Text style={{ fontSize: 28 }}>{icon}</Text>
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileText}>{text}</Text>
      {soon ? <Text style={styles.soon}>EM BREVE</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { fontWeight: '900', color: colors.cocoa, letterSpacing: 1, fontSize: font.tiny },
  cardTitle: { fontSize: font.h3, fontWeight: '800', color: colors.ink },
  reward: { color: colors.cocoa, fontWeight: '700', marginBottom: space.sm },
  arena: {
    backgroundColor: colors.arenaBg,
    borderRadius: radius.lg,
    padding: space.xl,
    gap: space.xs,
    borderBottomWidth: 6,
    borderBottomColor: colors.coral,
  },
  arenaKicker: { color: colors.sun, fontWeight: '900', letterSpacing: 1.5, fontSize: font.tiny },
  arenaTitle: { color: colors.arenaInk, fontSize: 30, fontWeight: '900' },
  arenaText: { color: colors.arenaMuted, fontSize: font.small },
  arenaHearts: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.md },
  arenaCta: { backgroundColor: colors.coral, borderRadius: radius.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  arenaCtaText: { color: '#fff', fontWeight: '900', letterSpacing: 0.8, fontSize: font.small },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: 2,
  },
  tileTitle: { fontWeight: '800', fontSize: font.body, color: colors.ink, marginTop: space.xs },
  tileText: { color: colors.muted, fontSize: font.tiny },
  soon: { marginTop: space.sm, color: colors.ocean, fontWeight: '900', fontSize: 10, letterSpacing: 1 },
});
