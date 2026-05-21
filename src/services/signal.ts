import FFT from 'fft.js';

const SAMPLE_RATE = 100;
const LOW_CUT_HZ = 2;
const HIGH_CUT_HZ = 12;
const PARKINSONS_FREQ_MIN = 4;
const PARKINSONS_FREQ_MAX = 6;
const AMPLITUDE_SCALE = 0.08;

// ─── Filters ────────────────────────────────────────────────────────────────

function bandpassFilter(samples: number[]): number[] {
  const dt = 1 / SAMPLE_RATE;
  const RC_low = 1 / (2 * Math.PI * HIGH_CUT_HZ);
  const RC_high = 1 / (2 * Math.PI * LOW_CUT_HZ);
  const alpha_low = dt / (RC_low + dt);
  const alpha_high = RC_high / (RC_high + dt);

  const lp = [samples[0]];
  for (let i = 1; i < samples.length; i++)
    lp.push(lp[i - 1] + alpha_low * (samples[i] - lp[i - 1]));

  const hp = [0];
  for (let i = 1; i < samples.length; i++)
    hp.push(alpha_high * (hp[i - 1] + lp[i] - lp[i - 1]));

  return hp;
}

function padToPow2(samples: number[]): number[] {
  const n = Math.pow(2, Math.floor(Math.log2(samples.length)));
  return samples.slice(0, n);
}

function rms(samples: number[]): number {
  return Math.sqrt(samples.reduce((s, v) => s + v * v, 0) / samples.length);
}

// ─── FFT helpers ─────────────────────────────────────────────────────────────

interface FFTResult {
  magnitudes: number[];
  phases: number[];
  n: number;
}

function runFFT(filtered: number[]): FFTResult {
  const prepared = padToPow2(filtered);
  const n = prepared.length;
  const fft = new FFT(n);
  const out = fft.createComplexArray();
  fft.realTransform(out, prepared);

  const magnitudes: number[] = [];
  const phases: number[] = [];
  for (let i = 0; i < n / 2; i++) {
    const re = out[2 * i];
    const im = out[2 * i + 1];
    magnitudes.push(Math.sqrt(re * re + im * im));
    phases.push(Math.atan2(im, re));
  }
  return { magnitudes, phases, n };
}

function binForFreq(freq: number, n: number): number {
  return Math.round((freq * n) / SAMPLE_RATE);
}

function freqForBin(bin: number, n: number): number {
  return (bin * SAMPLE_RATE) / n;
}

function binMag(mags: number[], bin: number): number {
  // average ±1 bins for robustness
  const lo = Math.max(1, bin - 1);
  const hi = Math.min(mags.length - 1, bin + 1);
  let sum = 0;
  for (let i = lo; i <= hi; i++) sum += mags[i];
  return sum / (hi - lo + 1);
}

// ─── 1. Dominant frequency ───────────────────────────────────────────────────

function findDominantFreq(mags: number[], n: number): number {
  const lo = binForFreq(LOW_CUT_HZ, n);
  const hi = binForFreq(HIGH_CUT_HZ, n);
  let maxMag = 0;
  let maxBin = lo;
  for (let i = lo; i < Math.min(hi, mags.length); i++) {
    if (mags[i] > maxMag) { maxMag = mags[i]; maxBin = i; }
  }
  return freqForBin(maxBin, n);
}

// ─── 2. Tremor Regularity (autocorrelation at dominant period lag) ───────────
// Parkinson's: very regular → high value (0.7–1.0)
// Essential / physiological: irregular → lower value

function regularityIndex(filtered: number[], domFreqHz: number): number {
  if (domFreqHz < 0.5) return 0;
  const lag = Math.round(SAMPLE_RATE / domFreqHz);
  const N = filtered.length - lag;
  if (N <= 0) return 0;

  let num = 0;
  let den = 0;
  for (let i = 0; i < N; i++) {
    num += filtered[i] * filtered[i + lag];
    den += filtered[i] * filtered[i];
  }
  // Normalize to [0, 1]
  const r = den > 0 ? num / den : 0;
  return Math.max(0, Math.min(1, (r + 1) / 2));
}

// ─── 3. Harmonic Ratio ────────────────────────────────────────────────────────
// Parkinson's: strong harmonics → ratio > 1.5
// Essential: weak harmonics → ratio < 0.8

function harmonicRatio(mags: number[], domFreqHz: number, n: number): number {
  const f0 = binForFreq(domFreqHz, n);
  const f1 = binForFreq(domFreqHz * 2, n);
  const f2 = binForFreq(domFreqHz * 3, n);

  const mag0 = binMag(mags, f0);
  if (mag0 < 1e-10) return 0;

  const harmEnergy =
    (f1 < mags.length ? binMag(mags, f1) : 0) +
    (f2 < mags.length ? binMag(mags, f2) : 0);

  return Math.round((harmEnergy / mag0) * 100) / 100;
}

// ─── 4. Tremor Intermittency ──────────────────────────────────────────────────
// Window-based: what % of time is tremor "on"
// Parkinson's: intermittent (50–80%)
// Essential: more continuous (70–100%)

function tremorIntermittency(filtered: number[]): number {
  const windowSize = SAMPLE_RATE; // 1-second windows
  const windows = Math.floor(filtered.length / windowSize);
  if (windows === 0) return 0;

  const windowRMSValues: number[] = [];
  for (let w = 0; w < windows; w++) {
    const slice = filtered.slice(w * windowSize, (w + 1) * windowSize);
    windowRMSValues.push(rms(slice));
  }

  const sorted = [...windowRMSValues].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const threshold = median * 1.5;

  const activeWindows = windowRMSValues.filter((v) => v > threshold).length;
  return Math.round((activeWindows / windows) * 100) / 100;
}

// ─── 5. Cross-axis Phase (pill-rolling detection) ────────────────────────────
// Uses FFT phase difference at dominant freq between X and Y axes
// Parkinson's pill-rolling: ~90° phase offset between X and Y

function crossAxisPhase(
  filteredX: number[],
  filteredY: number[],
  domFreqHz: number
): number {
  const { phases: phX, n } = runFFT(filteredX);
  const { phases: phY } = runFFT(filteredY);

  const bin = binForFreq(domFreqHz, n);
  if (bin >= phX.length || bin >= phY.length) return 0;

  let phaseDiff = phY[bin] - phX[bin];
  // Normalize to [0, 180]
  while (phaseDiff < 0) phaseDiff += 2 * Math.PI;
  while (phaseDiff > 2 * Math.PI) phaseDiff -= 2 * Math.PI;
  const degrees = (phaseDiff * 180) / Math.PI;
  return Math.round(degrees);
}

// ─── 6. Dominant Axis ─────────────────────────────────────────────────────────
// Which axis carries most tremor power

function dominantTremorAxis(
  filteredX: number[],
  filteredY: number[],
  filteredZ: number[]
): 'X' | 'Y' | 'Z' {
  const rx = rms(filteredX);
  const ry = rms(filteredY);
  const rz = rms(filteredZ);
  if (rx >= ry && rx >= rz) return 'X';
  if (ry >= rx && ry >= rz) return 'Y';
  return 'Z';
}

// ─── Tremor Profile Classification ───────────────────────────────────────────

export type TremorProfile =
  | 'parkinsons-likely'
  | 'essential-likely'
  | 'physiological'
  | 'minimal';

function classifyProfile(
  domFreqHz: number,
  amplitudeNorm: number,
  regularity: number,
  harmRatio: number,
  intermittency: number,
  phaseOffsetDeg: number
): TremorProfile {
  const inParkRange = domFreqHz >= PARKINSONS_FREQ_MIN && domFreqHz <= PARKINSONS_FREQ_MAX;
  const pillRolling = phaseOffsetDeg >= 60 && phaseOffsetDeg <= 120;

  if (amplitudeNorm < 0.1) return 'minimal';

  if (
    inParkRange &&
    regularity > 0.65 &&
    harmRatio > 1.2 &&
    intermittency > 0.4 &&
    pillRolling
  ) return 'parkinsons-likely';

  if (
    inParkRange &&
    regularity > 0.55 &&
    (harmRatio > 1.0 || intermittency > 0.35)
  ) return 'parkinsons-likely';

  if (amplitudeNorm > 0.15 && regularity > 0.45) return 'essential-likely';

  return 'physiological';
}

// ─── Public Interface ─────────────────────────────────────────────────────────

export interface SignalAnalysis {
  // Basic
  dominantFreqHz: number;
  amplitudeRMS: number;
  gyroRMS: number;
  score: number;
  inParkinsonsRange: boolean;
  // Advanced
  regularityIndex: number;
  harmonicRatio: number;
  intermittency: number;
  phaseOffsetDeg: number;
  dominantAxis: 'X' | 'Y' | 'Z';
  tremorProfile: TremorProfile;
}

export function analyzeSignal(
  samples: { x: number; y: number; z: number; gx?: number; gy?: number; gz?: number }[],
  noiseFloor: number
): SignalAnalysis {
  // Per-axis bandpass filtered signals
  const filteredX = bandpassFilter(samples.map((s) => s.x));
  const filteredY = bandpassFilter(samples.map((s) => s.y));
  const filteredZ = bandpassFilter(samples.map((s) => s.z));

  // Magnitude signal (noise-corrected)
  const magnitudes = samples.map((s) =>
    Math.sqrt(s.x * s.x + s.y * s.y + s.z * s.z) - noiseFloor
  );
  const filteredMag = bandpassFilter(magnitudes);

  // Gyro
  const hasGyro = samples.some((s) => s.gx !== undefined);
  const gyroMag = hasGyro
    ? samples.map((s) => Math.sqrt((s.gx ?? 0) ** 2 + (s.gy ?? 0) ** 2 + (s.gz ?? 0) ** 2))
    : [];
  const filteredGyro = hasGyro ? bandpassFilter(gyroMag) : [];

  // FFT on magnitude
  const { magnitudes: fftMags, n } = runFFT(filteredMag);
  const domFreqHz = findDominantFreq(fftMags, n);

  // Metrics
  const accRMS = rms(filteredMag);
  const gyroRMS = hasGyro ? rms(filteredGyro) : 0;
  const accNorm = Math.min(accRMS / AMPLITUDE_SCALE, 1);
  const gyroNorm = hasGyro ? Math.min(gyroRMS / 0.3, 1) : 0;
  const fusedAmplitude = hasGyro
    ? Math.min(accNorm * 0.6 + gyroNorm * 0.4, 1)
    : accNorm;

  const regIdx = regularityIndex(filteredMag, domFreqHz);
  const harmRatio = harmonicRatio(fftMags, domFreqHz, n);
  const intermit = tremorIntermittency(filteredMag);
  const phaseOff = crossAxisPhase(filteredX, filteredY, domFreqHz);
  const domAxis = dominantTremorAxis(filteredX, filteredY, filteredZ);

  const freqInRange = domFreqHz >= PARKINSONS_FREQ_MIN && domFreqHz <= PARKINSONS_FREQ_MAX;
  const profile = classifyProfile(domFreqHz, fusedAmplitude, regIdx, harmRatio, intermit, phaseOff);

  // Score: amplitude (65pts) + freq penalty (20pts) + regularity penalty (15pts)
  const amplitudePenalty = fusedAmplitude * 65;
  const freqPenalty = freqInRange ? 20 : 0;
  const regularityPenalty = regIdx > 0.7 && freqInRange ? 15 : 0;
  const score = Math.max(0, Math.min(100, Math.round(100 - amplitudePenalty - freqPenalty - regularityPenalty)));

  return {
    dominantFreqHz: Math.round(domFreqHz * 10) / 10,
    amplitudeRMS: Math.round(accRMS * 10000) / 10000,
    gyroRMS: Math.round(gyroRMS * 1000) / 1000,
    score,
    inParkinsonsRange: freqInRange,
    regularityIndex: Math.round(regIdx * 100) / 100,
    harmonicRatio: Math.round(harmRatio * 100) / 100,
    intermittency: Math.round(intermit * 100) / 100,
    phaseOffsetDeg: phaseOff,
    dominantAxis: domAxis,
    tremorProfile: profile,
  };
}
