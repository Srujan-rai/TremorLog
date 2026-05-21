import { Accelerometer } from 'expo-sensors';

const SAMPLE_RATE_HZ = 100;
const CAPTURE_DURATION_MS = 30_000;
const CALIBRATION_DURATION_MS = 5_000;

export interface SensorSample {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

export async function captureSamples(
  onProgress: (elapsed: number) => void
): Promise<SensorSample[]> {
  return new Promise((resolve, reject) => {
    const samples: SensorSample[] = [];
    const startTime = Date.now();

    Accelerometer.setUpdateInterval(1000 / SAMPLE_RATE_HZ);

    const sub = Accelerometer.addListener((data) => {
      const elapsed = Date.now() - startTime;
      samples.push({ ...data, timestamp: elapsed });
      onProgress(elapsed);
      if (elapsed >= CAPTURE_DURATION_MS) {
        sub.remove();
        resolve(samples);
      }
    });

    setTimeout(() => {
      sub.remove();
      reject(new Error('Capture timeout'));
    }, CAPTURE_DURATION_MS + 2000);
  });
}

export async function captureNoiseFloor(): Promise<number> {
  return new Promise((resolve) => {
    const magnitudes: number[] = [];
    Accelerometer.setUpdateInterval(1000 / SAMPLE_RATE_HZ);

    const sub = Accelerometer.addListener(({ x, y, z }) => {
      magnitudes.push(Math.sqrt(x * x + y * y + z * z));
    });

    setTimeout(() => {
      sub.remove();
      const mean = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
      resolve(mean);
    }, CALIBRATION_DURATION_MS);
  });
}

export async function detectActualSampleRate(): Promise<number> {
  return new Promise((resolve) => {
    const timestamps: number[] = [];
    Accelerometer.setUpdateInterval(10); // request 100Hz

    const sub = Accelerometer.addListener(() => {
      timestamps.push(Date.now());
      if (timestamps.length >= 50) {
        sub.remove();
        const elapsed = timestamps[49] - timestamps[0];
        const actualHz = Math.round((49 / elapsed) * 1000);
        resolve(actualHz);
      }
    });
  });
}
