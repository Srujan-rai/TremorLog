import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  AppState,
  AppStateStatus,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { captureSamples, captureNoiseFloor, SensorSample } from '../services/sensor';
import { analyzeSignal, SignalAnalysis } from '../services/signal';
import WaveformDisplay from '../components/WaveformDisplay';
import Screen from '../components/ui/Screen';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import PhaseStepper, { CapturePhase } from '../components/ui/PhaseStepper';
import ProgressRing from '../components/ui/ProgressRing';
import { movementColor, movementLabel } from '../theme/scoreColors';
import { colors, spacing, typography, radii } from '../theme/tokens';

type Phase = 'calibrating' | 'countdown' | 'capturing' | 'done' | 'error';

interface Props {
  hand: 'left' | 'right';
  onComplete: (samples: SensorSample[], analysis: SignalAnalysis, noiseFloor: number, durationMs: number) => void;
  onAbort: () => void;
}

const COUNTDOWN_SEC = 3;
const CAPTURE_MS = 30_000;
const CALIBRATION_MS = 5_000;
const MAX_WAVEFORM_POINTS = 150;

function toStepperPhase(phase: Phase): CapturePhase | null {
  if (phase === 'calibrating' || phase === 'countdown' || phase === 'capturing') return phase;
  return null;
}

export default function CaptureScreen({ hand, onComplete, onAbort }: Props) {
  const [phase, setPhase] = useState<Phase>('calibrating');
  const [countdown, setCountdown] = useState(COUNTDOWN_SEC);
  const [elapsed, setElapsed] = useState(0);
  const [calibElapsed, setCalibElapsed] = useState(0);
  const [waveformSamples, setWaveformSamples] = useState<number[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const abortedRef = useRef(false);
  const noiseFloorRef = useRef(0);
  const waveformRef = useRef<number[]>([]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active') {
        abortedRef.current = true;
        onAbort();
      }
    });
    return () => sub.remove();
  }, [onAbort]);

  useEffect(() => {
    runCalibration();
    return () => {
      abortedRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runCalibration() {
    const startTs = Date.now();
    const tick = setInterval(() => {
      if (abortedRef.current) {
        clearInterval(tick);
        return;
      }
      const e = Date.now() - startTs;
      setCalibElapsed(Math.min(e, CALIBRATION_MS));
      if (e >= CALIBRATION_MS) clearInterval(tick);
    }, 100);

    try {
      const noise = await captureNoiseFloor();
      clearInterval(tick);
      noiseFloorRef.current = noise;
      if (abortedRef.current) return;
      setPhase('countdown');
      startCountdown();
    } catch {
      clearInterval(tick);
      if (!abortedRef.current) {
        setPhase('error');
        setErrorMsg('Calibration failed. Try again.');
      }
    }
  }

  function startCountdown() {
    let count = COUNTDOWN_SEC;
    const interval = setInterval(() => {
      if (abortedRef.current) {
        clearInterval(interval);
        return;
      }
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        startCapture();
      }
    }, 1000);
  }

  async function startCapture() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPhase('capturing');
    const startMs = Date.now();

    try {
      const samples = await captureSamples((progress) => {
        if (abortedRef.current) return;
        setElapsed(progress.elapsed);
        // throttle waveform updates to ~20Hz to avoid React thrashing at 100Hz
        const next = [...waveformRef.current, progress.amplitude].slice(-MAX_WAVEFORM_POINTS);
        waveformRef.current = next;
        if (next.length % 5 === 0) {
          setWaveformSamples(next);
        }
      }, noiseFloorRef.current);

      if (abortedRef.current) return;

      const durationMs = Date.now() - startMs;
      if (durationMs < 10_000) {
        setPhase('error');
        setErrorMsg('Capture too short. Hold still for at least 10 seconds.');
        return;
      }

      const analysis = analyzeSignal(samples, noiseFloorRef.current);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete(samples, analysis, noiseFloorRef.current, durationMs);
    } catch (e: any) {
      if (!abortedRef.current) {
        setPhase('error');
        setErrorMsg(e?.message ?? 'Unknown error during capture.');
      }
    }
  }

  function handleAbort() {
    abortedRef.current = true;
    onAbort();
  }

  const remainingSec = Math.ceil((CAPTURE_MS - elapsed) / 1000);
  const progress = Math.min(elapsed / CAPTURE_MS, 1);
  const lastAmp = waveformSamples[waveformSamples.length - 1] ?? 0;
  const stabilityColor = movementColor(lastAmp);
  const stepperPhase = toStepperPhase(phase);

  return (
    <Screen contentStyle={styles.screen}>
      {stepperPhase && <PhaseStepper activePhase={stepperPhase} />}

      {phase === 'calibrating' && (
        <View style={styles.centerBlock}>
          <View style={styles.iconBadge}>
            <Ionicons name="phone-portrait-outline" size={40} color={colors.primary} />
          </View>
          <Text style={styles.instruction}>Place phone on flat surface</Text>
          <ProgressRing
            progress={calibElapsed / CALIBRATION_MS}
            label={`${Math.max(0, Math.ceil((CALIBRATION_MS - calibElapsed) / 1000))}`}
            sublabel="seconds"
            size={140}
          />
          <Text style={styles.subtext}>Measuring noise floor</Text>
        </View>
      )}

      {phase === 'countdown' && (
        <View style={styles.centerBlock}>
          <Text style={styles.instruction}>Now hold phone in your {hand} hand</Text>
          <View style={styles.countdownRing}>
            <Text style={styles.countdown}>{countdown}</Text>
          </View>
          <Text style={styles.subtext}>Keep your arm relaxed and steady</Text>
        </View>
      )}

      {phase === 'capturing' && (
        <View style={styles.centerBlock}>
          <Text style={styles.instruction}>Hold still</Text>
          <ProgressRing
            progress={progress}
            label={`${remainingSec}`}
            sublabel="seconds left"
          />
          <Card style={styles.waveCard}>
            <WaveformDisplay samples={waveformSamples} width={300} height={100} />
          </Card>
          <View style={[styles.pill, { backgroundColor: stabilityColor + '22' }]}>
            <Ionicons
              name={lastAmp > 0.3 ? 'pulse' : 'checkmark-circle'}
              size={18}
              color={stabilityColor}
              style={styles.pillIcon}
            />
            <Text style={[styles.pillText, { color: stabilityColor }]}>
              {movementLabel(lastAmp)}
            </Text>
          </View>
        </View>
      )}

      {phase === 'error' && (
        <View style={styles.centerBlock}>
          <Card style={styles.errorCard}>
            <Ionicons name="alert-circle" size={48} color={colors.danger} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </Card>
          <Button title="Go Back" onPress={onAbort} style={styles.errorButton} />
        </View>
      )}

      {phase !== 'done' && phase !== 'error' && (
        <Button title="Abort" variant="destructive" onPress={handleAbort} style={styles.abort} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    width: '100%',
  },
  iconBadge: {
    width: 96,
    height: 96,
    borderRadius: radii.full,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary + '40',
  },
  instruction: {
    ...typography.heading,
    textAlign: 'center',
  },
  subtext: {
    ...typography.caption,
    fontSize: 17,
    textAlign: 'center',
  },
  spinner: {
    marginTop: spacing.md,
  },
  countdownRing: {
    width: 160,
    height: 160,
    borderRadius: radii.full,
    borderWidth: 8,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  countdown: {
    fontSize: 80,
    fontWeight: '700',
    color: colors.primary,
  },
  waveCard: {
    width: '100%',
    padding: spacing.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    gap: spacing.xs,
  },
  pillIcon: {
    marginRight: spacing.xs,
  },
  pillText: {
    fontSize: 17,
    fontWeight: '600',
  },
  errorCard: {
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
  },
  errorText: {
    fontSize: 18,
    color: colors.danger,
    textAlign: 'center',
  },
  errorButton: {
    width: '100%',
  },
  abort: {
    marginTop: spacing.md,
  },
});
