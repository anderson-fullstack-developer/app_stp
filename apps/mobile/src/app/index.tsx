import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, ProgressBar, Screen, Subtitle, Title } from '@/components/ui';
import { colors, font, radius, space } from '@/theme/tokens';

interface Choice {
  id: string;
  label: string;
  icon?: string;
  hint?: string;
  disabled?: boolean;
}

const interfaceLanguages: Choice[] = [
  { id: 'pt', label: 'Português', icon: '🇵🇹' },
  { id: 'en', label: 'English', icon: '🇬🇧', hint: 'Em breve', disabled: true },
  { id: 'fr', label: 'Français', icon: '🇫🇷', hint: 'Em breve', disabled: true },
];

const learnLanguages: Choice[] = [
  { id: 'forro', label: 'Forro / Santomé', icon: '🇸🇹' },
  { id: 'angolar', label: 'Angolar', icon: '🌊', hint: 'Em breve', disabled: true },
  { id: 'lungie', label: "Lung'Ie / Principense", icon: '🌴', hint: 'Em breve', disabled: true },
];

const reasons: Choice[] = [
  { id: 'family', label: 'Família', icon: '👨‍👩‍👧' },
  { id: 'culture', label: 'Cultura', icon: '🥁' },
  { id: 'travel', label: 'Viagem', icon: '✈️' },
  { id: 'curious', label: 'Curiosidade', icon: '🤔' },
  { id: 'school', label: 'Escola', icon: '📚' },
  { id: 'better', label: 'Quero falar melhor', icon: '🗣️' },
  { id: 'other', label: 'Outro', icon: '✨' },
];

const goals: Choice[] = [
  { id: '5', label: '5 minutos', hint: 'Casual', icon: '🌱' },
  { id: '10', label: '10 minutos', hint: 'Regular', icon: '🌿' },
  { id: '15', label: '15 minutos', hint: 'Sério', icon: '🌳' },
  { id: '20', label: '20 minutos', hint: 'Intenso', icon: '🔥' },
];

const TOTAL_STEPS = 6;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({ ui: 'pt', learn: 'forro' });

  const next = () => (step < TOTAL_STEPS - 1 ? setStep(step + 1) : router.replace('/aprender'));
  const pick = (key: string, id: string) => setAnswers((a) => ({ ...a, [key]: id }));

  if (step === 0) {
    return (
      <Screen scroll={false} style={styles.splash}>
        <View style={styles.logoWrap}>
          <View style={styles.logo}>
            <Text style={styles.logoStar}>★</Text>
          </View>
          <Text style={styles.brand}>Fala Ilha</Text>
          <Text style={styles.tagline}>Aprende as línguas de São Tomé e Príncipe.</Text>
        </View>
        <View style={{ gap: space.md }}>
          <Button label="Começar" onPress={next} />
          <Button label="Já tenho conta" variant="ghost" onPress={() => router.replace('/aprender')} />
        </View>
      </Screen>
    );
  }

  const content = (() => {
    switch (step) {
      case 1:
        return (
          <ChoiceList title="Em que língua queres a app?" items={interfaceLanguages} value={answers.ui} onPick={(id) => pick('ui', id)} />
        );
      case 2:
        return (
          <ChoiceList title="Qual língua queres aprender?" items={learnLanguages} value={answers.learn} onPick={(id) => pick('learn', id)} />
        );
      case 3:
        return <ChoiceList title="Porque queres aprender?" items={reasons} value={answers.reason} onPick={(id) => pick('reason', id)} />;
      case 4:
        return <ChoiceList title="Qual é o teu objetivo diário?" items={goals} value={answers.goal} onPick={(id) => pick('goal', id)} />;
      default:
        return <CreateAccount />;
    }
  })();

  const canContinue = step === 3 ? !!answers.reason : step === 4 ? !!answers.goal : true;

  return (
    <Screen scroll={false}>
      <View style={styles.topBar}>
        <Pressable onPress={() => setStep(step - 1)} hitSlop={12}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <ProgressBar value={step / (TOTAL_STEPS - 1)} />
        </View>
      </View>
      <View style={{ flex: 1 }}>{content}</View>
      <Button label={step === TOTAL_STEPS - 1 ? 'Criar conta' : 'Continuar'} onPress={next} disabled={!canContinue} />
    </Screen>
  );
}

function ChoiceList({
  title,
  items,
  value,
  onPick,
}: {
  title: string;
  items: Choice[];
  value?: string;
  onPick: (id: string) => void;
}) {
  return (
    <View style={{ gap: space.md }}>
      <Title style={{ marginBottom: space.sm }}>{title}</Title>
      {items.map((item) => {
        const selected = value === item.id;
        return (
          <Pressable
            key={item.id}
            disabled={item.disabled}
            onPress={() => onPick(item.id)}
            style={[
              styles.choice,
              selected && styles.choiceSelected,
              item.disabled && { opacity: 0.5 },
            ]}>
            {item.icon ? <Text style={{ fontSize: 24 }}>{item.icon}</Text> : null}
            <Text style={[styles.choiceLabel, selected && { color: colors.primaryDark }]}>{item.label}</Text>
            {item.hint ? <Text style={styles.choiceHint}>{item.hint}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function CreateAccount() {
  return (
    <View style={{ gap: space.md }}>
      <Title>Cria a tua conta</Title>
      <Subtitle>Guarda o teu progresso, a tua sequência e desafia amigos.</Subtitle>
      <TextInput placeholder="Nome de utilizador" placeholderTextColor={colors.muted} style={styles.input} />
      <TextInput placeholder="Email" placeholderTextColor={colors.muted} style={styles.input} keyboardType="email-address" />
      <TextInput placeholder="Palavra-passe" placeholderTextColor={colors.muted} style={styles.input} secureTextEntry />
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={{ color: colors.muted }}>ou</Text>
        <View style={styles.line} />
      </View>
      <Pressable style={[styles.choice, { justifyContent: 'center' }]}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ocean }}>G</Text>
        <Text style={[styles.choiceLabel, { flex: 0 }]}>Continuar com Google</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  splash: { justifyContent: 'space-between', paddingVertical: space.xxl },
  logoWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 8,
    borderBottomColor: colors.primaryDark,
    transform: [{ rotate: '-6deg' }],
  },
  logoStar: { fontSize: 64, color: colors.sun, marginTop: -6 },
  brand: { fontSize: 40, fontWeight: '900', color: colors.ink, marginTop: space.md },
  tagline: { fontSize: font.h3, color: colors.muted, textAlign: 'center', maxWidth: 280, lineHeight: 26 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  back: { fontSize: 26, color: colors.muted, fontWeight: '700' },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.lg,
  },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  choiceLabel: { flex: 1, fontSize: font.body, fontWeight: '700', color: colors.ink },
  choiceHint: { fontSize: font.tiny, color: colors.muted, fontWeight: '700' },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.lg,
    fontSize: font.body,
    color: colors.ink,
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  line: { flex: 1, height: 2, backgroundColor: colors.border },
});
