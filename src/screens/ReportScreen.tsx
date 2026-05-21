import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { getAllSessions } from '../services/storage';
import { generateReport, shareReport } from '../services/pdf';

interface Props {
  onBack: () => void;
}

export default function ReportScreen({ onBack }: Props) {
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(false);
  const sessions = getAllSessions();

  async function handleGenerate() {
    if (sessions.length === 0) return;
    setLoading(true);
    try {
      const path = await generateReport(sessions, patientName || 'Anonymous');
      await shareReport(path);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not generate report.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>Generate Report</Text>

      <Text style={styles.label}>Patient name (optional)</Text>
      <TextInput
        style={styles.input}
        value={patientName}
        onChangeText={setPatientName}
        placeholder="Anonymous"
        placeholderTextColor="#aaa"
      />

      <Text style={styles.sessionCount}>{sessions.length} session(s) will be included</Text>

      <TouchableOpacity
        style={[styles.button, sessions.length === 0 && styles.buttonDisabled]}
        onPress={handleGenerate}
        disabled={sessions.length === 0 || loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Generating…' : 'Generate & Share PDF'}
        </Text>
      </TouchableOpacity>

      {sessions.length === 0 && (
        <Text style={styles.noSessions}>No sessions yet. Complete a test first.</Text>
      )}

      <Text style={styles.disclaimer}>
        This report is a symptom log, not a medical diagnosis. Share with your neurologist.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 32 },
  backButton: { minHeight: 48, justifyContent: 'center', marginBottom: 8 },
  backText: { fontSize: 18, color: '#2e86c1' },
  heading: { fontSize: 28, fontWeight: 'bold', color: '#1a5276', marginBottom: 24 },
  label: { fontSize: 18, color: '#555', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 16,
    fontSize: 18,
    marginBottom: 24,
    color: '#333',
  },
  sessionCount: { fontSize: 18, color: '#555', marginBottom: 32 },
  button: {
    backgroundColor: '#2e86c1',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 64,
    justifyContent: 'center',
  },
  buttonDisabled: { backgroundColor: '#bbb' },
  buttonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  noSessions: { fontSize: 18, color: '#e74c3c', textAlign: 'center', marginTop: 16 },
  disclaimer: { fontSize: 14, color: '#888', marginTop: 32, textAlign: 'center', lineHeight: 22 },
});
