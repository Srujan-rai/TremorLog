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
import { captureSamples, captureNoiseFloor, detectActualSampleRate } from '../services/sensor';
import { analyzeSignal, SignalAnalysis } from '../services/signal';
import { SensorSample } from '../services/sensor';

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
  const [amplitude, setAmplitude] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const abortedRef = useRef(false);
  const noiseFloorRef = useRef(0);
  const samplesRef = useRef<SensorSample[]>([]);

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

    try {
      const actualHz = await detectActualSampleRate();
      const samples = await captureSamples((elapsedMs) => {
        if (abortedRef.current) return;
        setElapsed(elapsedMs);
        // live amplitude from last sample
        const last = samplesRef.current[samplesRef.current.length - 1];
        if (last) {
          const mag = Math.sqrt(last.x * last.x + last.y * last.y + last.z * last.z);
          setAmplitude(Math.min((mag - noiseFloorRef.current) / 2, 1));
        }
      });

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
  const amplitudeColor = amplitude > 0.5 ? '#e74c3c' : amplitude > 0.2 ? '#f39c12' : '#27ae60';

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
          <View style={styles.amplitudeBar}>
            <View
              style={[
                styles.amplitudeFill,
                { width: `${Math.round(amplitude * 100)}%`, backgroundColor: amplitudeColor },
              ]}
            />
          </View>
          <Text style={[styles.subtext, { color: amplitudeColor }]}>
            {amplitude < 0.2 ? 'Very stable' : amplitude < 0.5 ? 'Some movement' : 'High movement'}
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
  amplitudeBar: {
    width: '100%',
    height: 32,
    backgroundColor: '#eee',
    borderRadius: 16,
    overflow: 'hidden',
  },
  amplitudeFill: {
    height: '100%',
    borderRadius: 16,
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
    marginTop: 16,
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
