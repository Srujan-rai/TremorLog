import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';

interface Props {
  value: number;
  color: string;
  hint?: string;
  displayValue?: string;
}

export default function ProgressBar({ value, color, hint, displayValue }: Props) {
  return (
    <View style={styles.wrapper}>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${Math.round(Math.min(Math.max(value, 0), 1) * 100)}%`, backgroundColor: color },
          ]}
        />
      </View>
      {displayValue ? <Text style={styles.value}>{displayValue}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.sm },
  hint: { fontSize: 14, color: colors.textHint, marginBottom: spacing.xs },
  track: {
    width: '100%',
    height: 10,
    backgroundColor: colors.border,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radii.sm },
  value: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
});
