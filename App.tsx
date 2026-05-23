import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { isOnboardingComplete, getAllSessions } from './src/services/storage';
import { SignalAnalysis } from './src/services/signal';
import { SensorSample } from './src/services/sensor';
import { TremorSession } from './src/types/session';
import ScreenFade from './src/components/ui/ScreenFade';
import { colors } from './src/theme/tokens';

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

function resolveInitialScreen(): Promise<Screen> {
  return Promise.race([
    isOnboardingComplete().then((done) => (done ? 'home' : 'onboarding')),
    new Promise<Screen>((resolve) => {
      setTimeout(() => resolve('onboarding'), 5000);
    }),
  ]).catch(() => 'onboarding' as Screen);
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [captureResult, setCaptureResult] = useState<CaptureResult | null>(null);
  const [previousSession, setPreviousSession] = useState<TremorSession | null>(null);

  useEffect(() => {
    let active = true;
    resolveInitialScreen().then((next) => {
      if (active) setScreen(next);
    });
    return () => {
      active = false;
    };
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

  function renderScreen() {
    switch (screen) {
      case 'onboarding':
        return <OnboardingScreen onComplete={() => setScreen('home')} />;
      case 'home':
        return (
          <HomeScreen
            onStartCapture={() => setScreen('capture')}
            onViewHistory={() => setScreen('history')}
            onViewReport={() => setScreen('report')}
          />
        );
      case 'capture':
        return (
          <CaptureScreen
            hand="right"
            onComplete={handleCaptureComplete}
            onAbort={() => setScreen('home')}
          />
        );
      case 'result':
        return captureResult ? (
          <ResultScreen
            analysis={captureResult.analysis}
            noiseFloor={captureResult.noiseFloor}
            durationMs={captureResult.durationMs}
            hand={captureResult.hand}
            previousSession={previousSession}
            onSave={() => setScreen('history')}
            onDiscard={() => setScreen('home')}
          />
        ) : null;
      case 'history':
        return (
          <HistoryScreen
            onBack={() => setScreen('home')}
            onStartCapture={() => setScreen('capture')}
          />
        );
      case 'report':
        return <ReportScreen onBack={() => setScreen('home')} />;
      default:
        return null;
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {screen === 'loading' ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScreenFade key={screen}>{renderScreen()}</ScreenFade>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
