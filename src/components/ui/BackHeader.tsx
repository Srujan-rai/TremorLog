import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme/tokens';

interface Props {
  onBack: () => void;
  title?: string;
}

export default function BackHeader({ onBack, title }: Props) {
  return (
    <View style={styles.wrapper}>
      <TouchableOpacity style={styles.backButton} onPress={onBack} accessibilityRole="button">
        <Ionicons name="chevron-back" size={24} color={colors.primary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
      {title ? <Text style={styles.title}>{title}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    gap: spacing.xs,
  },
  backText: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '600',
  },
  title: {
    ...typography.title,
    fontSize: 28,
    marginTop: spacing.sm,
  },
});
