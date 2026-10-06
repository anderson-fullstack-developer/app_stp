import { type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, font, radius, space } from '@/theme/tokens';

export function Screen({
  children,
  scroll = true,
  dark = false,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = dark ? colors.arenaBg : colors.bg;
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: bg }]} edges={['top']}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.content, style]} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Subtitle({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.subtitle, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonVariant = 'primary' | 'sun' | 'coral' | 'ghost' | 'outline';

const buttonColors: Record<ButtonVariant, { bg: string; shadow: string; text: string }> = {
  primary: { bg: colors.primary, shadow: colors.primaryDark, text: '#fff' },
  sun: { bg: colors.sun, shadow: colors.sunDark, text: colors.ink },
  coral: { bg: colors.coral, shadow: colors.coralDark, text: '#fff' },
  ghost: { bg: 'transparent', shadow: 'transparent', text: colors.primary },
  outline: { bg: colors.surface, shadow: colors.border, text: colors.ink },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = buttonColors[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: disabled ? colors.locked : c.bg,
          borderBottomColor: disabled ? '#ADA699' : c.shadow,
          borderWidth: variant === 'outline' ? 2 : 0,
          borderColor: colors.border,
          borderBottomWidth: variant === 'ghost' ? 0 : 4,
          transform: [{ translateY: pressed && !disabled ? 2 : 0 }],
        },
        style,
      ]}>
      <Text style={[styles.buttonText, { color: disabled ? '#fff' : c.text }]}>{label}</Text>
    </Pressable>
  );
}

export function ProgressBar({
  value,
  color = colors.primary,
  track = colors.border,
  height = 12,
}: {
  value: number;
  color?: string;
  track?: string;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={{ height, backgroundColor: track, borderRadius: radius.pill, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: radius.pill }} />
    </View>
  );
}

export function Pill({ icon, label, color = colors.ink }: { icon: string; label: string; color?: string }) {
  return (
    <View style={styles.pill}>
      <Text style={{ fontSize: 16 }}>{icon}</Text>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function Hearts({ lives, max, size = 18 }: { lives: number; max: number; size?: number }) {
  return (
    <Text style={{ fontSize: size, letterSpacing: 1 }}>
      {'❤️'.repeat(Math.max(0, lives))}
      <Text style={{ opacity: 0.25 }}>{'🖤'.repeat(Math.max(0, max - lives))}</Text>
    </Text>
  );
}

export function Avatar({ name, size = 40, color = colors.ocean }: { name: string; size?: number; color?: string }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.42 }}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export function DemoBanner({ text }: { text?: string }) {
  return (
    <View style={styles.demo}>
      <Text style={styles.demoText}>
        ⚠️ {text ?? 'Conteúdo de demonstração. As palavras reais em Forro serão inseridas e aprovadas por falantes nativos no painel.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.lg },
  title: { fontSize: font.h1, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: font.body, color: colors.muted, lineHeight: 22 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.sm,
  },
  button: {
    minHeight: 54,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  buttonText: { fontSize: font.body, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  pillText: { fontWeight: '800', fontSize: font.small },
  demo: {
    backgroundColor: colors.sunSoft,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.sun,
  },
  demoText: { color: colors.cocoa, fontSize: font.tiny, lineHeight: 17 },
});
