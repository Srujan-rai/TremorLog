import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radii } from '../../theme/tokens';

export type CapturePhase = 'calibrating' | 'countdown' | 'capturing';

const STEPS: { key: CapturePhase; label: string }[] = [
  { key: 'calibrating', label: 'Calibrate' },
  { key: 'countdown', label: 'Ready' },
  { key: 'capturing', label: 'Capture' },
];

interface Props {
  activePhase: CapturePhase;
}

function phaseIndex(phase: CapturePhase): number {
  return STEPS.findIndex((s) => s.key === phase);
}

export default function PhaseStepper({ activePhase }: Props) {
  const activeIdx = phaseIndex(activePhase);

  return (
    <View style={styles.container}>
      {STEPS.map((step, i) => {
        const isActive = i === activeIdx;
        const isDone = i < activeIdx;
        return (
          <View key={step.key} style={styles.step}>
            <View
              style={[
                styles.dot,
                isActive && styles.dotActive,
                isDone && styles.dotDone,
              ]}
            />
            <Text
              style={[
                styles.label,
                (isActive || isDone) && styles.labelActive,
              ]}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: spacing.md,
  },
  step: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dotActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    width: 14,
    height: 14,
  },
  dotDone: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  label: {
    fontSize: 14,
    color: colors.textHint,
    fontWeight: '500',
  },
  labelActive: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
});
