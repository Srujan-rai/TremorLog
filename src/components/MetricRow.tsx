import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme/tokens';

interface Props {
  label: string;
  value: string;
  sub?: string;
}

export default function MetricRow({ label, value, sub }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.right}>
        <Text style={styles.value}>{value}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
  },
  label: { fontSize: 16, color: colors.textMuted, flex: 1 },
  right: { alignItems: 'flex-end', flex: 1 },
  value: { fontSize: 16, fontWeight: '600', color: colors.text },
  sub: { fontSize: 14, color: colors.textHint, textAlign: 'right', marginTop: 2 },
});
