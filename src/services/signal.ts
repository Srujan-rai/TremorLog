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

// ─── 7. Spectral Entropy ──────────────────────────────────────────────────────
// Shannon entropy of normalized power spectrum in 2–12Hz band.
// Pure sinusoid (Parkinson's) → low entropy (< 0.5)
// White noise / irregular signal → high entropy (> 0.8)

function spectralEntropy(mags: number[], n: number): number {
  const lo = binForFreq(LOW_CUT_HZ, n);
  const hi = Math.min(binForFreq(HIGH_CUT_HZ, n), mags.length);
  let totalPower = 0;
  const power: number[] = [];
  for (let i = lo; i < hi; i++) {
    const p = mags[i] * mags[i];
    power.push(p);
    totalPower += p;
  }
  if (totalPower < 1e-12) return 0;
  let H = 0;
  for (const p of power) {
    const norm = p / totalPower;
    if (norm > 0) H -= norm * Math.log2(norm);
  }
  // Normalize to [0, 1] using max entropy log2(bins)
  const maxH = Math.log2(power.length);
  return maxH > 0 ? H / maxH : 0;
}

// ─── 8. Tremor Band Power Ratio ───────────────────────────────────────────────
// Energy in 4–6Hz (Parkinson's band) / total energy in 2–12Hz
// Parkinson's: high concentration (> 0.4)
// Essential / physiological: distributed across band (< 0.25)

function tremorBandPowerRatio(mags: number[], n: number): number {
  const lo = binForFreq(LOW_CUT_HZ, n);
  const hi = Math.min(binForFreq(HIGH_CUT_HZ, n), mags.length);
  const pkLo = binForFreq(PARKINSONS_FREQ_MIN, n);
  const pkHi = Math.min(binForFreq(PARKINSONS_FREQ_MAX, n), mags.length);

  let totalPower = 0;
  let parkPower = 0;
  for (let i = lo; i < hi; i++) {
    const p = mags[i] * mags[i];
    totalPower += p;
    if (i >= pkLo && i <= pkHi) parkPower += p;
  }
  return totalPower > 0 ? parkPower / totalPower : 0;
}

// ─── 9. Frequency Jitter (windowed FFT) ──────────────────────────────────────
// Variance of dominant frequency across overlapping 4s windows.
// Parkinson's: highly stable frequency → low jitter (< 0.3 Hz)
// Cerebellar / irregular: drifts → high jitter (> 1 Hz)

function frequencyJitter(filtered: number[]): number {
  const windowSize = 4 * SAMPLE_RATE; // 4 seconds
  const hop = SAMPLE_RATE * 2;        // 2-second hop (50% overlap)
  if (filtered.length < windowSize) return 0;

  const freqs: number[] = [];
  for (let start = 0; start + windowSize <= filtered.length; start += hop) {
    const window = filtered.slice(start, start + windowSize);
    const { magnitudes, n } = runFFT(window);
    freqs.push(findDominantFreq(magnitudes, n));
  }
  if (freqs.length < 2) return 0;
  const mean = freqs.reduce((a, b) => a + b, 0) / freqs.length;
  const variance = freqs.reduce((s, f) => s + (f - mean) ** 2, 0) / freqs.length;
  return Math.sqrt(variance); // standard deviation in Hz
}

// ─── 10. Spectral Peak Q-factor ──────────────────────────────────────────────
// Sharpness of dominant peak: f0 / bandwidth at half-max.
// Parkinson's: very sharp peak → high Q (> 5)
// Essential / cerebellar: broad peak → low Q (< 2)

function peakQFactor(mags: number[], domFreqHz: number, n: number): number {
  const f0bin = binForFreq(domFreqHz, n);
  if (f0bin <= 0 || f0bin >= mags.length) return 0;
  const peak = mags[f0bin];
  if (peak < 1e-12) return 0;
  const halfMax = peak / Math.sqrt(2);

  let left = f0bin;
  while (left > 0 && mags[left] > halfMax) left--;
  let right = f0bin;
  while (right < mags.length - 1 && mags[right] > halfMax) right++;

  const bandwidth = freqForBin(right - left, n);
  return bandwidth > 0 ? Math.round((domFreqHz / bandwidth) * 100) / 100 : 0;
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
  phaseOffsetDeg: number,
  spectralEntropyVal: number,
  bandPowerRatioVal: number,
  freqJitterHz: number,
  qFactor: number,
): TremorProfile {
  const inParkRange = domFreqHz >= PARKINSONS_FREQ_MIN && domFreqHz <= PARKINSONS_FREQ_MAX;
  const pillRolling = phaseOffsetDeg >= 60 && phaseOffsetDeg <= 120;

  if (amplitudeNorm < 0.1) return 'minimal';

  // Weighted Parkinson's score from multiple features (each 0–1)
  let parkScore = 0;
  if (inParkRange) parkScore += 0.25;
  if (regularity > 0.65) parkScore += 0.15;
  if (harmRatio > 1.2) parkScore += 0.10;
  if (intermittency > 0.4) parkScore += 0.10;
  if (pillRolling) parkScore += 0.10;
  if (bandPowerRatioVal > 0.4) parkScore += 0.10;
  if (spectralEntropyVal < 0.55) parkScore += 0.10;
  if (qFactor > 4) parkScore += 0.05;
  if (freqJitterHz < 0.5) parkScore += 0.05;

  if (parkScore >= 0.55) return 'parkinsons-likely';

  // Essential: significant amplitude, moderate regularity, broader spectrum
  if (
    amplitudeNorm > 0.15 &&
    regularity > 0.45 &&
    spectralEntropyVal > 0.55
  ) return 'essential-likely';

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
  // Innovation: deep spectral features
  spectralEntropy: number;     // 0–1, low = pure tone
  bandPowerRatio: number;      // 0–1, energy concentrated in Parkinson's band
  frequencyJitterHz: number;   // std dev of windowed dominant freq
  peakQFactor: number;         // f0/bandwidth, peak sharpness
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
  const specEntropy = spectralEntropy(fftMags, n);
  const bandRatio = tremorBandPowerRatio(fftMags, n);
  const freqJitter = frequencyJitter(filteredMag);
  const qFactor = peakQFactor(fftMags, domFreqHz, n);

  const freqInRange = domFreqHz >= PARKINSONS_FREQ_MIN && domFreqHz <= PARKINSONS_FREQ_MAX;
  const profile = classifyProfile(
    domFreqHz, fusedAmplitude, regIdx, harmRatio, intermit, phaseOff,
    specEntropy, bandRatio, freqJitter, qFactor,
  );

  // Score (max 100). Penalties:
  //  - Amplitude (up to 50)
  //  - Freq in Parkinson's band (15)
  //  - High regularity in band (10)
  //  - High band power ratio (10)
  //  - Sharp peak / high Q (10)
  //  - Low spectral entropy (5)
  const amplitudePenalty = fusedAmplitude * 50;
  const freqPenalty = freqInRange ? 15 : 0;
  const regularityPenalty = regIdx > 0.7 && freqInRange ? 10 : 0;
  const bandPenalty = bandRatio > 0.4 ? 10 : 0;
  const qPenalty = qFactor > 5 ? 10 : qFactor > 3 ? 5 : 0;
  const entropyPenalty = specEntropy < 0.5 && freqInRange ? 5 : 0;
  const score = Math.max(0, Math.min(100, Math.round(
    100 - amplitudePenalty - freqPenalty - regularityPenalty - bandPenalty - qPenalty - entropyPenalty
  )));

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
    spectralEntropy: Math.round(specEntropy * 100) / 100,
    bandPowerRatio: Math.round(bandRatio * 100) / 100,
    frequencyJitterHz: Math.round(freqJitter * 100) / 100,
    peakQFactor: qFactor,
  };
}
