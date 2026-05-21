import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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

  const scoreColor =
    analysis.score >= 80
      ? '#27ae60'
      : analysis.score >= 60
      ? '#f39c12'
      : analysis.score >= 40
      ? '#e67e22'
      : '#e74c3c';

  function handleSave() {
    const session = saveSession({
      timestamp: Date.now(),
      durationMs,
      score: analysis.score,
      dominantFreqHz: analysis.dominantFreqHz,
      amplitudeRMS: analysis.amplitudeRMS,
      deviceModel: Device.modelName ?? 'Unknown',
      noiseFloor,
      hand,
    });
    onSave(session);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Stability Score</Text>
      <Text style={[styles.score, { color: scoreColor }]}>{analysis.score}</Text>

      <View style={styles.details}>
        <Text style={styles.detail}>
          Dominant frequency: {analysis.dominantFreqHz} Hz
          {analysis.inParkinsonsRange ? '  ⚠️ In tremor range (4–6 Hz)' : ''}
        </Text>
        <Text style={styles.detail}>
          Movement level: {analysis.amplitudeRMS.toFixed(3)}
        </Text>
        {delta !== null && (
          <Text style={[styles.detail, { color: delta >= 0 ? '#27ae60' : '#e74c3c' }]}>
            vs last session: {delta >= 0 ? '+' : ''}{delta} pts
          </Text>
        )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
    backgroundColor: '#fff',
    alignItems: 'center',
    gap: 16,
  },
  label: {
    fontSize: 20,
    color: '#555',
  },
  score: {
    fontSize: 96,
    fontWeight: 'bold',
  },
  details: {
    width: '100%',
    backgroundColor: '#eaf4fb',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  detail: {
    fontSize: 18,
    color: '#333',
  },
  warningBox: {
    backgroundColor: '#fdf2f2',
    borderColor: '#e74c3c',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  warningText: {
    fontSize: 18,
    color: '#e74c3c',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#2e86c1',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    minHeight: 64,
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  discardButton: {
    padding: 16,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardText: {
    fontSize: 18,
    color: '#888',
  },
});
