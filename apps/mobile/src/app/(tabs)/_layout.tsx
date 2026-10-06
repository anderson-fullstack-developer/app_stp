import { Tabs } from 'expo-router/js-tabs';
import { Text } from 'react-native';

import { colors } from '@/theme/tokens';

const icon = (emoji: string) =>
  function TabIcon({ focused }: { focused: boolean }) {
    return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>;
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 2,
          height: 68,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontWeight: '800', fontSize: 10, letterSpacing: 0.4 },
      }}>
      <Tabs.Screen name="aprender" options={{ title: 'APRENDER', tabBarIcon: icon('📖') }} />
      <Tabs.Screen name="desafios" options={{ title: 'DESAFIOS', tabBarIcon: icon('⚔️') }} />
      <Tabs.Screen name="amigos" options={{ title: 'AMIGOS', tabBarIcon: icon('🤝') }} />
      <Tabs.Screen name="ranking" options={{ title: 'RANKING', tabBarIcon: icon('🏆') }} />
      <Tabs.Screen name="perfil" options={{ title: 'PERFIL', tabBarIcon: icon('👤') }} />
    </Tabs>
  );
}
