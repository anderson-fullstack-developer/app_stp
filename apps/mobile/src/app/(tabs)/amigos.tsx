import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar, Button, Card, Screen, Title } from '@/components/ui';
import { friendRequests, friends } from '@/mocks/data';
import { colors, font, radius, space } from '@/theme/tokens';

export default function Friends() {
  return (
    <Screen>
      <Title>Amigos</Title>
      <TextInput placeholder="🔍  Pesquisar pessoas" placeholderTextColor={colors.muted} style={styles.search} />

      {friendRequests.length > 0 ? (
        <Card>
          <Text style={styles.section}>PEDIDOS DE AMIZADE</Text>
          {friendRequests.map((r) => (
            <View key={r.id} style={styles.row}>
              <Avatar name={r.name} color={r.color} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{r.name}</Text>
                <Text style={styles.meta}>Level {r.level}</Text>
              </View>
              <Button label="Aceitar" style={styles.smallBtn} />
              <Button label="✕" variant="outline" style={[styles.smallBtn, { paddingHorizontal: space.md }]} />
            </View>
          ))}
        </Card>
      ) : null}

      <Text style={styles.section}>OS TEUS AMIGOS · {friends.length}</Text>
      {friends.map((f) => (
        <Card key={f.id}>
          <View style={styles.row}>
            <View>
              <Avatar name={f.name} color={f.color} size={48} />
              <View style={[styles.dot, { backgroundColor: f.online ? colors.primary : colors.locked }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{f.name}</Text>
              <Text style={styles.meta}>
                Level {f.level} · {f.weeklyXp} XP esta semana · 🔥 {f.streak}
              </Text>
              <Text style={[styles.meta, { color: f.online ? colors.primary : colors.muted }]}>{f.online ? 'Online' : 'Offline'}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button label="Desafiar" variant="coral" style={{ flex: 1, minHeight: 44 }} />
            <Button label="Perfil" variant="outline" style={{ flex: 1, minHeight: 44 }} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    fontSize: font.body,
    color: colors.ink,
  },
  section: { fontWeight: '900', color: colors.muted, fontSize: font.tiny, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  name: { fontWeight: '800', fontSize: font.body, color: colors.ink },
  meta: { color: colors.muted, fontSize: font.tiny, marginTop: 2 },
  dot: { position: 'absolute', right: 0, bottom: 0, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
  smallBtn: { minHeight: 40, paddingHorizontal: space.lg },
});
