import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../components/ui/Screen';
import Button from '../components/ui/Button';
import { colors, spacing, radii, typography, shadows } from '../theme/tokens';

interface Props {
  onStartCapture: () => void;
  onViewHistory: () => void;
  onViewReport: () => void;
}

export default function HomeScreen({ onStartCapture, onViewHistory, onViewReport }: Props) {
  return (
    <Screen contentStyle={styles.screen}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroIconCircle}>
          <Ionicons name="pulse" size={28} color={colors.surface} />
        </View>
        <Text style={styles.title}>TremorLog</Text>
        <Text style={styles.subtitle}>Track your hand stability over time</Text>
      </LinearGradient>

      <View style={styles.actions}>
        <Button
          title="Start Test"
          onPress={onStartCapture}
          icon={<Ionicons name="play-circle" size={28} color={colors.surface} />}
        />
        <Button
          title="View History"
          variant="secondary"
          onPress={onViewHistory}
          icon={<Ionicons name="time-outline" size={22} color={colors.primaryDark} />}
        />
        <Button
          title="Generate Report"
          variant="secondary"
          onPress={onViewReport}
          icon={<Ionicons name="document-text-outline" size={22} color={colors.primaryDark} />}
        />
      </View>

      <View style={styles.footer}>
        <Ionicons name="information-circle-outline" size={16} color={colors.textHint} />
        <Text style={styles.footerText}>30 seconds · hold phone flat on your palm</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'flex-start',
  },
  hero: {
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginBottom: spacing.xxl,
    overflow: 'hidden',
    ...shadows.card,
  },
  heroIconCircle: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.surface,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.88)',
    lineHeight: 24,
  },
  actions: {
    gap: spacing.lg,
    flex: 1,
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  footerText: {
    fontSize: 15,
    color: colors.textHint,
  },
});
