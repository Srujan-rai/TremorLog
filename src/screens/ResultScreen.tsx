import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TremorSession } from '../types/session';
import { saveSession } from '../services/storage';
import { SignalAnalysis } from '../services/signal';
import * as Device from 'expo-device';
import Screen from '../components/ui/Screen';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ProgressRing from '../components/ui/ProgressRing';
import MetricRow from '../components/MetricRow';
import ProgressBar from '../components/ProgressBar';
import { scoreColor, deltaColor } from '../theme/scoreColors';
import { colors, spacing, radii, typography } from '../theme/tokens';

interface Props {
  analysis: SignalAnalysis;
  noiseFloor: number;
  durationMs: number;
  hand: 'left' | 'right';
  previousSession: TremorSession | null;
  onSave: (session: TremorSession) => void;
  onDiscard: () => void;
}

type ProfileMeta = { label: string; color: string; icon: keyof typeof Ionicons.glyphMap };

const PROFILE_LABELS: Record<string, ProfileMeta> = {
  'parkinsons-likely': { label: "Parkinson's-like pattern", color: colors.danger, icon: 'warning' },
  'essential-likely':  { label: 'Essential tremor pattern', color: colors.orange, icon: 'pulse' },
  'physiological':     { label: 'Physiological tremor',     color: colors.warning, icon: 'information-circle' },
  'minimal':           { label: 'Minimal / No tremor',      color: colors.success, icon: 'checkmark-circle' },
};

export default function ResultScreen({
  analysis,
  noiseFloor,
  durationMs,
  hand,
  previousSession,
  onSave,
  onDiscard,
}: Props) {
  const delta = previousSession ? analysis.score - previousSession.score : null;
  const showWarning = delta !== null && delta < -20;
  const profile = PROFILE_LABELS[analysis.tremorProfile];
  const sColor = scoreColor(analysis.score);
  const pillRolling = analysis.phaseOffsetDeg >= 60 && analysis.phaseOffsetDeg <= 120;

  async function handleSave() {
    const session = await saveSession({
      timestamp: Date.now(),
      durationMs,
      score: analysis.score,
      dominantFreqHz: analysis.dominantFreqHz,
      amplitudeRMS: analysis.amplitudeRMS,
      gyroRMS: analysis.gyroRMS,
      deviceModel: Device.modelName ?? 'Unknown',
      noiseFloor,
      hand,
      regularityIndex: analysis.regularityIndex,
      harmonicRatio: analysis.harmonicRatio,
      intermittency: analysis.intermittency,
      phaseOffsetDeg: analysis.phaseOffsetDeg,
      dominantAxis: analysis.dominantAxis,
      tremorProfile: analysis.tremorProfile,
      spectralEntropy: analysis.spectralEntropy,
      bandPowerRatio: analysis.bandPowerRatio,
      frequencyJitterHz: analysis.frequencyJitterHz,
      peakQFactor: analysis.peakQFactor,
    });
    onSave(session);
  }

  return (
    <Screen scroll contentStyle={styles.container}>
      <Text style={styles.scoreLabel}>Stability Score</Text>

      <ProgressRing
        progress={analysis.score / 100}
        label={`${analysis.score}`}
        sublabel="out of 100"
        size={180}
        stroke={14}
        color={sColor}
        labelColor={sColor}
        labelSize={64}
      />

      {delta !== null && (
        <View style={[styles.deltaPill, { backgroundColor: deltaColor(delta) + '1A' }]}>
          <Ionicons
            name={delta >= 0 ? 'arrow-up' : 'arrow-down'}
            size={16}
            color={deltaColor(delta)}
          />
          <Text style={[styles.delta, { color: deltaColor(delta) }]}>
            {Math.abs(delta)} pts vs last session
          </Text>
        </View>
      )}

      <View style={[styles.profileBadge, { backgroundColor: profile.color + '1A', borderColor: profile.color + '66' }]}>
        <Ionicons name={profile.icon} size={20} color={profile.color} />
        <Text style={[styles.profileText, { color: profile.color }]}>{profile.label}</Text>
      </View>

      <Card style={styles.section}>
        <View style={styles.cardHeader}>
          <Ionicons name="radio-outline" size={20} color={colors.primaryDark} />
          <Text style={styles.cardTitle}>Signal</Text>
        </View>
        <MetricRow
          label="Dominant Frequency"
          value={`${analysis.dominantFreqHz} Hz`}
          sub={analysis.inParkinsonsRange ? "In Parkinson's range (4–6 Hz)" : "Outside Parkinson's range"}
        />
        <MetricRow label="Dominant Axis" value={`${analysis.dominantAxis}-axis`} />
        <MetricRow label="Acc RMS" value={`${analysis.amplitudeRMS.toFixed(4)} g`} />
        <MetricRow label="Gyro RMS" value={`${analysis.gyroRMS.toFixed(3)} rad/s`} />
      </Card>

      <Card style={styles.section}>
        <View style={styles.cardHeader}>
          <Ionicons name="analytics-outline" size={20} color={colors.primaryDark} />
          <Text style={styles.cardTitle}>Advanced Analysis</Text>
        </View>

        <Text style={styles.metricLabel}>Regularity Index</Text>
        <ProgressBar
          value={analysis.regularityIndex}
          color={analysis.regularityIndex > 0.7 ? colors.danger : colors.primary}
          hint="High = very periodic (Parkinson's-like)"
          displayValue={analysis.regularityIndex.toFixed(2)}
        />

        <Text style={styles.metricLabel}>Harmonic Ratio</Text>
        <ProgressBar
          value={Math.min(analysis.harmonicRatio / 3, 1)}
          color={analysis.harmonicRatio > 1.5 ? colors.danger : colors.primary}
          hint="High = strong harmonics (Parkinson's-like)"
          displayValue={analysis.harmonicRatio.toFixed(2)}
        />

        <Text style={styles.metricLabel}>Tremor Intermittency</Text>
        <ProgressBar
          value={analysis.intermittency}
          color={analysis.intermittency > 0.5 ? colors.orange : colors.primary}
          hint="% of time tremor was active"
          displayValue={`${Math.round(analysis.intermittency * 100)}%`}
        />

        <MetricRow
          label="Cross-axis Phase Offset"
          value={`${analysis.phaseOffsetDeg}°`}
          sub={pillRolling ? 'Pill-rolling pattern' : 'No pill-rolling detected'}
        />
      </Card>

      <Card style={styles.section}>
        <View style={styles.cardHeader}>
          <Ionicons name="layers-outline" size={20} color={colors.primaryDark} />
          <Text style={styles.cardTitle}>Deep Spectral Features</Text>
        </View>

        <Text style={styles.metricLabel}>Spectral Entropy</Text>
        <ProgressBar
          value={analysis.spectralEntropy}
          color={analysis.spectralEntropy < 0.5 ? colors.danger : colors.primary}
          hint="Low = pure tone (Parkinson's-like). High = noise."
          displayValue={analysis.spectralEntropy.toFixed(2)}
        />

        <Text style={styles.metricLabel}>Tremor Band Power Ratio</Text>
        <ProgressBar
          value={analysis.bandPowerRatio}
          color={analysis.bandPowerRatio > 0.4 ? colors.danger : colors.primary}
          hint="% of energy in 4–6Hz Parkinson's band"
          displayValue={`${Math.round(analysis.bandPowerRatio * 100)}%`}
        />

        <MetricRow
          label="Frequency Jitter"
          value={`${analysis.frequencyJitterHz.toFixed(2)} Hz`}
          sub={analysis.frequencyJitterHz < 0.5 ? 'Stable freq (Parkinson\'s-like)' : 'Frequency drifts'}
        />
        <MetricRow
          label="Peak Q-factor"
          value={analysis.peakQFactor.toFixed(2)}
          sub={analysis.peakQFactor > 5 ? 'Very sharp peak' : analysis.peakQFactor > 3 ? 'Moderate peak' : 'Broad peak'}
        />
      </Card>

      {showWarning && (
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={22} color={colors.danger} />
          <Text style={styles.warningText}>
            Score dropped significantly. Consider showing your doctor.
          </Text>
        </View>
      )}

      <Button title="Save Session" onPress={handleSave} style={styles.fullWidth} />
      <Button title="Discard" variant="ghost" onPress={onDiscard} />

      <Text style={styles.disclaimer}>
        Symptom log only. Not a medical diagnosis.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  scoreLabel: {
    ...typography.caption,
    fontSize: 18,
    marginTop: spacing.lg,
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  delta: {
    fontSize: 16,
    fontWeight: '600',
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: radii.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  profileText: {
    fontSize: 16,
    fontWeight: '700',
  },
  section: {
    width: '100%',
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  metricLabel: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.warningBg,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    borderRadius: radii.md,
    padding: spacing.lg,
    width: '100%',
  },
  warningText: {
    flex: 1,
    fontSize: 16,
    color: colors.danger,
    lineHeight: 22,
  },
  fullWidth: {
    width: '100%',
  },
  disclaimer: {
    fontSize: 14,
    color: colors.textDisabled,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
