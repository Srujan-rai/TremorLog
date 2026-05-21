import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  onStartCapture: () => void;
  onViewHistory: () => void;
  onViewReport: () => void;
}

export default function HomeScreen({ onStartCapture, onViewHistory, onViewReport }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>TremorLog</Text>
      <Text style={styles.subtitle}>Track your hand stability over time</Text>

      <TouchableOpacity style={styles.primaryButton} onPress={onStartCapture}>
        <Text style={styles.primaryButtonText}>Start Test</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={onViewHistory}>
        <Text style={styles.secondaryButtonText}>View History</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={onViewReport}>
        <Text style={styles.secondaryButtonText}>Generate Report</Text>
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
    gap: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a5276',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#555',
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#2e86c1',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#eaf4fb',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 64,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#1a5276',
    fontSize: 20,
    fontWeight: '600',
  },
});
