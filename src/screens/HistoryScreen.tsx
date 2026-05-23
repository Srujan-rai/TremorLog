import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAllSessions, deleteSession } from '../services/storage';
import { TremorSession } from '../types/session';
import TrendChart from '../components/TrendChart';
import Screen from '../components/ui/Screen';
import BackHeader from '../components/ui/BackHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { scoreColor, deltaColor } from '../theme/scoreColors';
import { colors, spacing, radii } from '../theme/tokens';

interface Props {
  onBack: () => void;
  onStartCapture?: () => void;
}

export default function HistoryScreen({ onBack, onStartCapture }: Props) {
  const [sessions, setSessions] = useState<TremorSession[]>([]);

  useEffect(() => {
    getAllSessions().then(setSessions);
  }, []);

  function confirmDelete(id: string) {
    Alert.alert('Delete session?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSession(id);
          getAllSessions().then(setSessions);
        },
      },
    ]);
  }

  const chartScores = [...sessions].reverse().slice(-30).map((s) => s.score);

  if (sessions.length === 0) {
    return (
      <Screen contentStyle={styles.screen}>
        <BackHeader onBack={onBack} title="History" />
        <View style={styles.emptyState}>
          <Ionicons name="analytics-outline" size={64} color={colors.textHint} />
          <Text style={styles.emptyTitle}>No sessions yet</Text>
          <Text style={styles.emptyText}>Take your first test to start tracking</Text>
          {onStartCapture && (
            <Button title="Start first test" variant="secondary" onPress={onStartCapture} style={styles.emptyButton} />
          )}
        </View>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.screen}>
      <BackHeader onBack={onBack} title="History" />

      {chartScores.length > 1 && (
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Trend (last 30 sessions)</Text>
          <TrendChart scores={chartScores} width={340} height={180} />
        </Card>
      )}

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => {
          const prev = sessions[index + 1];
          const delta = prev ? item.score - prev.score : null;
          const chipColor = scoreColor(item.score);

          return (
            <Card style={styles.sessionCard}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowDate}>
                  {new Date(item.timestamp).toLocaleDateString()}
                </Text>
                <View style={[styles.scoreChip, { backgroundColor: chipColor + '22' }]}>
                  <Text style={[styles.rowScore, { color: chipColor }]}>{item.score}</Text>
                </View>
                {delta !== null && (
                  <View style={[styles.deltaBadge, { backgroundColor: deltaColor(delta) + '18' }]}>
                    <Text style={[styles.rowDelta, { color: deltaColor(delta) }]}>
                      {delta >= 0 ? '+' : ''}{delta}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => confirmDelete(item.id)}
                accessibilityLabel="Delete session"
              >
                <Ionicons name="trash-outline" size={22} color={colors.danger} />
              </TouchableOpacity>
            </Card>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.lg,
  },
  chartCard: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryDark,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  rowInfo: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  rowDate: {
    fontSize: 18,
    color: colors.textSecondary,
    flex: 1,
  },
  scoreChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    minWidth: 48,
    alignItems: 'center',
  },
  rowScore: {
    fontSize: 22,
    fontWeight: '700',
  },
  deltaBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  rowDelta: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    padding: spacing.sm,
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  emptyText: {
    fontSize: 18,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyButton: {
    width: '100%',
    marginTop: spacing.lg,
  },
});
