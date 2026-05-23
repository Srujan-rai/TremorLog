import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { getAllSessions } from '../services/storage';
import { generateReport, shareReport } from '../services/pdf';
import { TremorSession } from '../types/session';
import Screen from '../components/ui/Screen';
import BackHeader from '../components/ui/BackHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import TextInput from '../components/ui/TextInput';
import { colors, spacing, typography } from '../theme/tokens';

interface Props {
  onBack: () => void;
}

export default function ReportScreen({ onBack }: Props) {
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<TremorSession[]>([]);

  useEffect(() => {
    getAllSessions().then(setSessions);
  }, []);

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
    <Screen contentStyle={styles.screen}>
      <BackHeader onBack={onBack} title="Generate Report" />

      <Card style={styles.formCard}>
        <Text style={styles.label}>Patient name (optional)</Text>
        <TextInput
          value={patientName}
          onChangeText={setPatientName}
          placeholder="Anonymous"
        />

        <Text style={styles.sessionCount}>
          {sessions.length} session(s) will be included
        </Text>
      </Card>

      <Button
        title="Generate & Share PDF"
        onPress={handleGenerate}
        disabled={sessions.length === 0}
        loading={loading}
        style={styles.button}
      />

      {sessions.length === 0 && (
        <Text style={styles.noSessions}>No sessions yet. Complete a test first.</Text>
      )}

      <Text style={styles.disclaimer}>
        This report is a symptom log, not a medical diagnosis. Share with your neurologist.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.lg,
  },
  formCard: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  label: {
    ...typography.caption,
    fontSize: 18,
    color: colors.textMuted,
  },
  sessionCount: {
    fontSize: 18,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  button: {
    width: '100%',
  },
  noSessions: {
    fontSize: 18,
    color: colors.danger,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  disclaimer: {
    fontSize: 14,
    color: colors.textHint,
    marginTop: spacing.xxl,
    textAlign: 'center',
    lineHeight: 22,
  },
});
