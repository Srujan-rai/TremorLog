import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { CartesianChart, Line } from 'victory-native';
import { getAllSessions, deleteSession } from '../services/storage';
import { TremorSession } from '../types/session';

interface Props {
  onBack: () => void;
}

export default function HistoryScreen({ onBack }: Props) {
  const [sessions, setSessions] = useState<TremorSession[]>([]);

  useEffect(() => {
    setSessions(getAllSessions());
  }, []);

  function handleDelete(id: string) {
    deleteSession(id);
    setSessions(getAllSessions());
  }

  const chartData = [...sessions]
    .reverse()
    .slice(-30)
    .map((s, i) => ({ x: i + 1, score: s.score }));

  if (sessions.length === 0) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Take your first test to start tracking</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>History</Text>

      {chartData.length > 1 && (
        <View style={{ height: 200 }}>
          <CartesianChart
            data={chartData}
            xKey="x"
            yKeys={['score']}
            domainPadding={{ top: 10 }}
          >
            {({ points }) => (
              <Line points={points.score} color="#2e86c1" strokeWidth={2} />
            )}
          </CartesianChart>
        </View>
      )}

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const prev = sessions[index + 1];
          const delta = prev ? item.score - prev.score : null;
          return (
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowDate}>
                  {new Date(item.timestamp).toLocaleDateString()}
                </Text>
                <Text style={styles.rowScore}>{item.score}</Text>
                {delta !== null && (
                  <Text style={[styles.rowDelta, { color: delta >= 0 ? '#27ae60' : '#e74c3c' }]}>
                    {delta >= 0 ? '+' : ''}{delta}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item.id)}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  backButton: { minHeight: 48, justifyContent: 'center', marginBottom: 8 },
  backText: { fontSize: 18, color: '#2e86c1' },
  heading: { fontSize: 28, fontWeight: 'bold', color: '#1a5276', marginBottom: 16 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 20, color: '#555', textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rowInfo: { flex: 1, flexDirection: 'row', gap: 16, alignItems: 'center' },
  rowDate: { fontSize: 18, color: '#333' },
  rowScore: { fontSize: 22, fontWeight: 'bold', color: '#1a5276' },
  rowDelta: { fontSize: 16 },
  deleteButton: {
    padding: 8,
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: { fontSize: 16, color: '#e74c3c' },
});
