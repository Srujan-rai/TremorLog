import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { TremorSession } from '../types/session';
import { saveSession } from '../services/storage';
import { SignalAnalysis } from '../services/signal';
import * as Device from 'expo-device';

interface Props {
  analysis: SignalAnalysis;
  noiseFloor: number;
  durationMs: number;
  hand: 'left' | 'right';
  previousSession: TremorSession | null;
  onSave: (session: TremorSession) => void;
  onDiscard: () => void;
}

const PROFILE_LABELS: Record<string, { label: string; color: string }> = {
  'parkinsons-likely': { label: 'Parkinson\'s-like pattern', color: '#e74c3c' },
  'essential-likely':  { label: 'Essential tremor pattern', color: '#e67e22' },
  'physiological':     { label: 'Physiological tremor',     color: '#f39c12' },
  'minimal':           { label: 'Minimal / No tremor',      color: '#27ae60' },
};

function MetricRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricRight}>
        <Text style={styles.metricValue}>{value}</Text>
        {sub ? <Text style={styles.metricSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${Math.round(value * 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

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

  const scoreColor =
    analysis.score >= 80 ? '#27ae60' :
    analysis.score >= 60 ? '#f39c12' :
    analysis.score >= 40 ? '#e67e22' : '#e74c3c';

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
    });
    onSave(session);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Score */}
      <Text style={styles.scoreLabel}>Stability Score</Text>
      <Text style={[styles.score, { color: scoreColor }]}>{analysis.score}</Text>

      {delta !== null && (
        <Text style={[styles.delta, { color: delta >= 0 ? '#27ae60' : '#e74c3c' }]}>
          {delta >= 0 ? '+' : ''}{delta} vs last session
        </Text>
      )}

      {/* Profile badge */}
      <View style={[styles.profileBadge, { borderColor: profile.color }]}>
        <Text style={[styles.profileText, { color: profile.color }]}>{profile.label}</Text>
      </View>

      {/* Basic metrics */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Signal</Text>
        <MetricRow
          label="Dominant Frequency"
          value={`${analysis.dominantFreqHz} Hz`}
          sub={analysis.inParkinsonsRange ? '⚠ In Parkinson\'s range (4–6 Hz)' : 'Outside Parkinson\'s range'}
        />
        <MetricRow label="Dominant Axis" value={`${analysis.dominantAxis}-axis`} />
        <MetricRow label="Acc RMS" value={`${analysis.amplitudeRMS.toFixed(4)} g`} />
        <MetricRow label="Gyro RMS" value={`${analysis.gyroRMS.toFixed(3)} rad/s`} />
      </View>

      {/* Advanced metrics */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Advanced Analysis</Text>

        <Text style={styles.metricLabel}>Regularity Index</Text>
        <Text style={styles.metricHint}>High = very periodic (Parkinson's-like)</Text>
        <Bar value={analysis.regularityIndex} color={analysis.regularityIndex > 0.7 ? '#e74c3c' : '#2e86c1'} />
        <Text style={styles.barValue}>{analysis.regularityIndex.toFixed(2)}</Text>

        <Text style={[styles.metricLabel, { marginTop: 12 }]}>Harmonic Ratio</Text>
        <Text style={styles.metricHint}>High = strong harmonics (Parkinson's-like)</Text>
        <Bar value={Math.min(analysis.harmonicRatio / 3, 1)} color={analysis.harmonicRatio > 1.5 ? '#e74c3c' : '#2e86c1'} />
        <Text style={styles.barValue}>{analysis.harmonicRatio.toFixed(2)}</Text>

        <Text style={[styles.metricLabel, { marginTop: 12 }]}>Tremor Intermittency</Text>
        <Text style={styles.metricHint}>% of time tremor was active</Text>
        <Bar value={analysis.intermittency} color={analysis.intermittency > 0.5 ? '#e67e22' : '#2e86c1'} />
        <Text style={styles.barValue}>{Math.round(analysis.intermittency * 100)}%</Text>

        <MetricRow
          label="Cross-axis Phase Offset"
          value={`${analysis.phaseOffsetDeg}°`}
          sub={analysis.phaseOffsetDeg >= 60 && analysis.phaseOffsetDeg <= 120 ? '⚠ Pill-rolling pattern' : 'No pill-rolling detected'}
        />
      </View>

      {showWarning && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Score dropped significantly. Consider showing your doctor.
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Session</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.discardButton} onPress={onDiscard}>
        <Text style={styles.discardText}>Discard</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        Symptom log only. Not a medical diagnosis.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#fff', alignItems: 'center', gap: 12 },
  scoreLabel: { fontSize: 18, color: '#555', marginTop: 16 },
  score: { fontSize: 88, fontWeight: 'bold', lineHeight: 96 },
  delta: { fontSize: 18 },
  profileBadge: {
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginVertical: 4,
  },
  profileText: { fontSize: 16, fontWeight: '700' },
  card: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a5276', marginBottom: 4 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 4 },
  metricLabel: { fontSize: 15, color: '#444', flex: 1 },
  metricRight: { alignItems: 'flex-end', flex: 1 },
  metricValue: { fontSize: 15, fontWeight: '600', color: '#222' },
  metricSub: { fontSize: 12, color: '#888', textAlign: 'right' },
  metricHint: { fontSize: 12, color: '#888', marginBottom: 4 },
  barTrack: { width: '100%', height: 10, backgroundColor: '#e0e0e0', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  barValue: { fontSize: 13, color: '#555', marginTop: 2 },
  warningBox: {
    backgroundColor: '#fdf2f2', borderColor: '#e74c3c', borderWidth: 1,
    borderRadius: 12, padding: 16, width: '100%',
  },
  warningText: { fontSize: 16, color: '#e74c3c', textAlign: 'center' },
  saveButton: {
    backgroundColor: '#2e86c1', padding: 18, borderRadius: 12,
    width: '100%', alignItems: 'center', minHeight: 60,
  },
  saveButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  discardButton: { padding: 14, minHeight: 48, alignItems: 'center' },
  discardText: { fontSize: 16, color: '#888' },
  disclaimer: { fontSize: 12, color: '#aaa', textAlign: 'center', paddingBottom: 16 },
});
