import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { isOnboardingComplete, getAllSessions } from './src/services/storage';
import { SignalAnalysis } from './src/services/signal';
import { SensorSample } from './src/services/sensor';
import { TremorSession } from './src/types/session';

import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import CaptureScreen from './src/screens/CaptureScreen';
import ResultScreen from './src/screens/ResultScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ReportScreen from './src/screens/ReportScreen';

type Screen = 'loading' | 'onboarding' | 'home' | 'capture' | 'result' | 'history' | 'report';

interface CaptureResult {
  samples: SensorSample[];
  analysis: SignalAnalysis;
  noiseFloor: number;
  durationMs: number;
  hand: 'left' | 'right';
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [captureResult, setCaptureResult] = useState<CaptureResult | null>(null);
  const [previousSession, setPreviousSession] = useState<TremorSession | null>(null);

  useEffect(() => {
    isOnboardingComplete()
      .then((done) => {
        setScreen(done ? 'home' : 'onboarding');
      })
      .catch(() => {
        setScreen('onboarding');
      });
  }, []);

  async function handleCaptureComplete(
    samples: SensorSample[],
    analysis: SignalAnalysis,
    noiseFloor: number,
    durationMs: number
  ) {
    const sessions = await getAllSessions();
    setPreviousSession(sessions[0] ?? null);
    setCaptureResult({ samples, analysis, noiseFloor, durationMs, hand: 'right' });
    setScreen('result');
  }

  if (screen === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {screen === 'onboarding' && (
        <OnboardingScreen onComplete={() => setScreen('home')} />
      )}

      {screen === 'home' && (
        <HomeScreen
          onStartCapture={() => setScreen('capture')}
          onViewHistory={() => setScreen('history')}
          onViewReport={() => setScreen('report')}
        />
      )}

      {screen === 'capture' && (
        <CaptureScreen
          hand="right"
          onComplete={handleCaptureComplete}
          onAbort={() => setScreen('home')}
        />
      )}

      {screen === 'result' && captureResult && (
        <ResultScreen
          analysis={captureResult.analysis}
          noiseFloor={captureResult.noiseFloor}
          durationMs={captureResult.durationMs}
          hand={captureResult.hand}
          previousSession={previousSession}
          onSave={() => setScreen('history')}
          onDiscard={() => setScreen('home')}
        />
      )}

      {screen === 'history' && (
        <HistoryScreen onBack={() => setScreen('home')} />
      )}

      {screen === 'report' && (
        <ReportScreen onBack={() => setScreen('home')} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});
