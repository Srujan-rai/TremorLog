import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { setOnboardingComplete } from '../services/storage';
import Screen from '../components/ui/Screen';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import StepDots from '../components/ui/StepDots';
import { colors, spacing, radii, typography } from '../theme/tokens';

interface Props {
  onComplete: () => void;
}

const STEPS = [
  {
    title: 'What is tremor?',
    body: 'Tremor is an involuntary shaking of a body part. This app helps you track hand tremor over time so you can share meaningful data with your doctor.',
    icon: 'information-circle-outline' as const,
  },
  {
    title: 'How to hold your phone',
    body: 'Hold your phone flat on your palm with your right or left hand. Slightly bend your elbow. Sit down and rest your elbow on an armrest if possible. Stay relaxed.',
    icon: 'hand-left-outline' as const,
  },
  {
    title: 'What your score means',
    body: '80–100: Very stable\n60–79: Some tremor detected\n40–59: Moderate tremor — track closely\n0–39: Significant tremor — show your doctor',
    icon: 'stats-chart-outline' as const,
  },
];

export default function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  async function handleNext() {
    if (isLast) {
      await setOnboardingComplete();
      onComplete();
    } else {
      setStep(step + 1);
    }
  }

  return (
    <Screen centered contentStyle={styles.screen}>
      <StepDots total={STEPS.length} current={step} />

      <View style={styles.iconBadge}>
        <Ionicons name={current.icon} size={48} color={colors.primary} />
      </View>

      <Text style={styles.title}>{current.title}</Text>

      <Card style={styles.card}>
        <Text style={styles.body}>{current.body}</Text>
      </Card>

      <Button
        title={isLast ? 'Get Started' : 'Next'}
        onPress={handleNext}
        style={styles.button}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'center',
  },
  iconBadge: {
    width: 96,
    height: 96,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.xl,
    borderWidth: 2,
    borderColor: colors.primaryMuted,
  },
  title: {
    ...typography.heading,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  card: {
    width: '100%',
    marginBottom: spacing.xxl,
  },
  body: {
    ...typography.body,
    fontSize: 18,
  },
  button: {
    width: '100%',
  },
});
