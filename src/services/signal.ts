import FFT from 'fft.js';

const SAMPLE_RATE = 100;
const LOW_CUT_HZ = 2;
const HIGH_CUT_HZ = 12;
const PARKINSONS_FREQ_MIN = 4;
const PARKINSONS_FREQ_MAX = 6;

function bandpassFilter(samples: number[]): number[] {
  const dt = 1 / SAMPLE_RATE;
  const RC_low = 1 / (2 * Math.PI * HIGH_CUT_HZ);
  const RC_high = 1 / (2 * Math.PI * LOW_CUT_HZ);
  const alpha_low = dt / (RC_low + dt);
  const alpha_high = RC_high / (RC_high + dt);

  const lowpassed = [samples[0]];
  for (let i = 1; i < samples.length; i++) {
    lowpassed.push(lowpassed[i - 1] + alpha_low * (samples[i] - lowpassed[i - 1]));
  }

  const highpassed = [0];
  for (let i = 1; i < samples.length; i++) {
    highpassed.push(
      alpha_high * (highpassed[i - 1] + lowpassed[i] - lowpassed[i - 1])
    );
  }

  return highpassed;
}

function prepareForFFT(samples: number[]): number[] {
  const n = Math.pow(2, Math.floor(Math.log2(samples.length)));
  return samples.slice(0, n);
}

export interface SignalAnalysis {
  dominantFreqHz: number;
  amplitudeRMS: number;
  score: number;
  inParkinsonsRange: boolean;
}

export function analyzeSignal(
  samples: { x: number; y: number; z: number }[],
  noiseFloor: number
): SignalAnalysis {
  const magnitudes = samples.map((s) =>
    Math.sqrt(s.x * s.x + s.y * s.y + s.z * s.z) - noiseFloor
  );

  const filtered = bandpassFilter(magnitudes);
  const prepared = prepareForFFT(filtered);
  const n = prepared.length;

  const fft = new FFT(n);
  const out = fft.createComplexArray();
  fft.realTransform(out, prepared);

  let maxMag = 0;
  let maxBin = 0;
  for (let i = 1; i < n / 2; i++) {
    const re = out[2 * i];
    const im = out[2 * i + 1];
    const mag = Math.sqrt(re * re + im * im);
    if (mag > maxMag) {
      maxMag = mag;
      maxBin = i;
    }
  }

  const dominantFreqHz = (maxBin * SAMPLE_RATE) / n;

  const rms = Math.sqrt(filtered.reduce((s, v) => s + v * v, 0) / filtered.length);
  const amplitudeRMS = Math.min(rms / 2, 1);

  const freqInRange =
    dominantFreqHz >= PARKINSONS_FREQ_MIN && dominantFreqHz <= PARKINSONS_FREQ_MAX;
  const freqPenalty = freqInRange ? 0.6 : 0.2;
  const rawScore = 100 - amplitudeRMS * 100 * freqPenalty * 2;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  return {
    dominantFreqHz: Math.round(dominantFreqHz * 10) / 10,
    amplitudeRMS: Math.round(amplitudeRMS * 1000) / 1000,
    score,
    inParkinsonsRange: freqInRange,
  };
}
