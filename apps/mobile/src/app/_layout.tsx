import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';

import { colors } from '@/theme/tokens';

export default function RootLayout() {
  return (
    <View style={styles.outer}>
      {/* No navegador, limita a largura para simular um telemóvel. */}
      <View style={styles.frame}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="lesson/[id]" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="arena/survival" options={{ presentation: 'fullScreenModal' }} />
        </Stack>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#E9E1D3' : colors.bg,
    alignItems: 'center',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 430 : undefined,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
});
