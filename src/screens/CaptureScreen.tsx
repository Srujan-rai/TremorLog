import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AppState,
  AppStateStatus,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Accelerometer } from 'expo-sensors';
import { captureSamples, captureNoiseFloor, detectActualSampleRate } from '../services/sensor';
import { analyzeSignal, SignalAnalysis } from '../services/signal';
import { SensorSample } from '../services/sensor';
import WaveformDisplay from '../components/WaveformDisplay';

type Phase = 'calibrating' | 'countdown' | 'capturing' | 'done' | 'error';

interface Props {
  hand: 'left' | 'right';
  onComplete: (samples: SensorSample[], analysis: SignalAnalysis, noiseFloor: number, durationMs: number) => void;
  onAbort: () => void;
}

const COUNTDOWN_SEC = 3;

export default function CaptureScreen({ hand, onComplete, onAbort }: Props) {
  const [phase, setPhase] = useState<Phase>('calibrating');
  const [countdown, setCountdown] = useState(COUNTDOWN_SEC);
  const [elapsed, setElapsed] = useState(0);
  const [waveformSamples, setWaveformSamples] = useState<number[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const abortedRef = useRef(false);
  const noiseFloorRef = useRef(0);
  const samplesRef = useRef<SensorSample[]>([]);
  const waveformRef = useRef<number[]>([]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active') {
        abortedRef.current = true;
        onAbort();
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    runCalibration();
  }, []);

  async function runCalibration() {
    try {
      const noise = await captureNoiseFloor();
      noiseFloorRef.current = noise;
      if (abortedRef.current) return;
      setPhase('countdown');
      startCountdown();
    } catch {
      setPhase('error');
      setErrorMsg('Calibration failed. Try again.');
    }
  }

  function startCountdown() {
    let count = COUNTDOWN_SEC;
    const interval = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        if (!abortedRef.current) startCapture();
      }
    }, 1000);
  }

  async function startCapture() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPhase('capturing');
    const startMs = Date.now();

    // Live waveform listener runs in parallel
    Accelerometer.setUpdateInterval(50); // ~20Hz for display
    const waveformSub = Accelerometer.addListener(({ x, y, z }) => {
      const mag = Math.sqrt(x * x + y * y + z * z) - noiseFloorRef.current;
      const normalized = Math.min(Math.max(mag / 0.5, 0), 1);
      waveformRef.current = [...waveformRef.current.slice(-149), normalized];
      setWaveformSamples([...waveformRef.current]);
    });

    try {
      const samples = await captureSamples((elapsedMs) => {
        if (abortedRef.current) return;
        setElapsed(elapsedMs);
        samplesRef.current = samples ?? [];
      });

      waveformSub.remove();
      samplesRef.current = samples;

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
      waveformSub.remove();
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

  const remainingSec = Math.ceil((30_000 - elapsed) / 1000);
  const lastAmp = waveformSamples[waveformSamples.length - 1] ?? 0;
  const stabilityLabel = lastAmp > 0.6 ? 'High movement' : lastAmp > 0.3 ? 'Some movement' : 'Very stable';
  const stabilityColor = lastAmp > 0.6 ? '#e74c3c' : lastAmp > 0.3 ? '#f39c12' : '#27ae60';

  return (
    <View style={styles.container}>
      {phase === 'calibrating' && (
        <>
          <Text style={styles.instruction}>Place phone on flat surface</Text>
          <Text style={styles.subtext}>Measuring noise floor… (5 sec)</Text>
        </>
      )}

      {phase === 'countdown' && (
        <>
          <Text style={styles.instruction}>Now hold phone in your {hand} hand</Text>
          <Text style={styles.countdown}>{countdown}</Text>
        </>
      )}

      {phase === 'capturing' && (
        <>
          <Text style={styles.instruction}>Hold still, keep your arm relaxed</Text>
          <Text style={styles.timer}>{remainingSec}s</Text>

          <WaveformDisplay samples={waveformSamples} width={320} height={100} />

          <Text style={[styles.stabilityLabel, { color: stabilityColor }]}>
            {stabilityLabel}
          </Text>
        </>
      )}

      {phase === 'error' && (
        <>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.button} onPress={onAbort}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </>
      )}

      {phase !== 'done' && phase !== 'error' && (
        <TouchableOpacity style={styles.abortButton} onPress={handleAbort}>
          <Text style={styles.abortText}>Abort</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    gap: 24,
  },
  instruction: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a5276',
    textAlign: 'center',
  },
  subtext: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
  },
  countdown: {
    fontSize: 80,
    fontWeight: 'bold',
    color: '#2e86c1',
  },
  timer: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#1a5276',
  },
  stabilityLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#2e86c1',
    padding: 20,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
    minHeight: 64,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  abortButton: {
    marginTop: 8,
    padding: 16,
    minHeight: 48,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abortText: {
    fontSize: 18,
    color: '#e74c3c',
  },
  errorText: {
    fontSize: 20,
    color: '#e74c3c',
    textAlign: 'center',
  },
});
