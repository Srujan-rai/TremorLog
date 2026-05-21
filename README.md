# TremorLog

A React Native app for tracking hand tremor in Parkinson's patients. Hold your phone for 30 seconds → get a stability score + clinical signal analysis → share a PDF report with your neurologist.

Built for real patients. Local-first. No data ever leaves the device.

---

## Why This Exists

Parkinson's patients see their neurologist every 3–6 months. Between visits, tremor can worsen, improve, or shift with medication changes — but there's no record. TremorLog fills that gap: a passive sensor log that produces a doctor-readable PDF from a phone anyone already owns.

---

## Features

### Core
- **30-second tremor capture** using accelerometer + gyroscope at 100Hz
- **Noise floor calibration** — 5-second baseline on flat surface before each test
- **0–100 stability score** — 100 = no tremor, 0 = severe tremor
- **Session history** with trend chart
- **PDF report** generation + sharing (WhatsApp, email, etc.)
- **Onboarding flow** designed for elderly, non-technical users (18px+ fonts, 48px+ tap targets)

### Advanced Signal Analysis

TremorLog goes beyond simple amplitude detection. Each session computes 5 clinical-grade signal features:

#### 1. Dominant Frequency (FFT)
The primary oscillation frequency extracted via Fast Fourier Transform after bandpass filtering (2–12 Hz). The 4–6 Hz range is characteristic of Parkinson's resting tremor.

#### 2. Tremor Regularity Index
Measures how *periodic* the tremor is using autocorrelation at the dominant frequency lag.

```
R[k] = Σ(x[n] · x[n+k]) / Σ(x[n]²)
```

- **> 0.70** → Very regular (Parkinson's-like)
- **0.45–0.70** → Moderately regular (Essential tremor)
- **< 0.45** → Irregular (physiological / noise)

Parkinson's tremor is pathologically regular. Essential tremor is less so. This single metric has strong discriminative power between the two.

#### 3. Harmonic Ratio
Measures the energy at 2× and 3× the fundamental frequency relative to the fundamental itself.

```
H = (FFT[2f₀] + FFT[3f₀]) / FFT[f₀]
```

- **> 1.5** → Strong harmonics (Parkinson's-like)
- **< 0.8** → Weak harmonics (Essential tremor / physiological)

Parkinson's tremor is a near-perfect sinusoid at 4–6 Hz with prominent harmonics. Essential tremor tends to be less sinusoidal.

#### 4. Tremor Intermittency
Divides the 30-second capture into 1-second windows. A window is "active" if its RMS exceeds 1.5× the median window RMS.

```
Intermittency = (active windows) / (total windows)
```

- **50–80%** → Intermittent (Parkinson's-like — tremor switches on/off)
- **> 80%** → Continuous (Essential tremor)
- **< 30%** → Rare / Minimal

#### 5. Cross-axis Phase Offset (Pill-rolling Detection)
Computes the phase difference between X and Y axes at the dominant frequency using FFT phase angles.

```
Δφ = angle(Y_FFT[f₀]) − angle(X_FFT[f₀])
```

- **60–120°** → Pill-rolling pattern (classic Parkinson's sign — pronation-supination of the forearm)
- Outside this range → No pill-rolling detected

#### 6. Dominant Tremor Axis
Identifies which axis (X/Y/Z) carries the most bandpass-filtered power. Parkinson's pronation-supination tremor is predominantly single-axis. Cerebellar tremor tends to be multi-axis.

### Tremor Profile Classification

All 6 features are fused into a single classification:

| Profile | Criteria |
|---------|----------|
| **Parkinson's-likely** | 4–6 Hz + Regularity > 0.65 + Harmonic ratio > 1.2 + Intermittency > 0.4 + Pill-rolling phase |
| **Essential-likely** | Significant amplitude + Regularity > 0.45 + Outside 4–6 Hz range |
| **Physiological** | Low–moderate amplitude, irregular |
| **Minimal** | Very low amplitude, no clinical pattern |

> **Important:** This is a symptom log, not a diagnostic tool. The profile classification is informational. Only a neurologist can diagnose Parkinson's disease.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo SDK 54 |
| Language | TypeScript |
| Sensors | `expo-sensors` (Accelerometer + Gyroscope at 100Hz) |
| Signal Processing | `fft.js` (FFT), custom IIR bandpass filter |
| Storage | `@react-native-async-storage/async-storage` (local, encrypted on-device) |
| Charts | `react-native-svg` (custom SVG line chart) |
| PDF Export | `expo-print` + `expo-sharing` |
| Haptics | `expo-haptics` |

---

## Project Structure

```
TremorLog/
├── App.tsx                        # Root — state-machine navigation
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx         # Dashboard with large "Start Test" button
│   │   ├── CaptureScreen.tsx      # 30s capture with live waveform
│   │   ├── ResultScreen.tsx       # Full signal analysis results
│   │   ├── HistoryScreen.tsx      # Session list + trend chart
│   │   ├── ReportScreen.tsx       # PDF generation + sharing
│   │   └── OnboardingScreen.tsx   # 3-screen first-run flow
│   ├── services/
│   │   ├── sensor.ts              # Accelerometer + gyroscope capture
│   │   ├── signal.ts              # Bandpass filter + FFT + all 6 metrics
│   │   ├── storage.ts             # AsyncStorage session CRUD
│   │   └── pdf.ts                 # HTML report builder + expo-print
│   ├── components/
│   │   ├── WaveformDisplay.tsx    # Live scrolling waveform (SVG)
│   │   └── TrendChart.tsx         # Score trend line chart (SVG)
│   └── types/
│       └── session.ts             # TremorSession + CalibrationBaseline types
├── assets/
├── babel.config.js
├── app.json
└── tsconfig.json
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Expo Go app on Android or iOS device
- Phone and computer on the same WiFi network

### Install

```bash
git clone https://github.com/Srujan-rai/TremorLog.git
cd TremorLog
npm install
```

### Run

```bash
npm start
```

Scan the QR code with Expo Go. If QR doesn't appear, open Expo Go → "Enter URL manually" → `exp://<YOUR_IP>:8081`.

### Build (Android APK)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

---

## Signal Pipeline

```
Accelerometer (100Hz) ──┐
                         ├─► Magnitude vector ─► Noise floor subtraction
Gyroscope (100Hz) ──────┘         │
                                   ▼
                          IIR Bandpass Filter (2–12 Hz)
                                   │
                    ┌──────────────┼──────────────────────┐
                    ▼              ▼                       ▼
                  FFT          Autocorrelation      1s Window RMS
                    │              │                       │
            Dominant Freq    Regularity Index       Intermittency
            Harmonic Ratio   Cross-axis Phase
            Dominant Axis
                    │
                    ▼
            Score (0–100) + Tremor Profile Classification
```

---

## Data Schema

```typescript
interface TremorSession {
  id: string;
  timestamp: number;
  durationMs: number;
  score: number;              // 0–100
  dominantFreqHz: number;
  amplitudeRMS: number;       // g units after bandpass
  gyroRMS: number;            // rad/s after bandpass
  deviceModel: string;
  noiseFloor: number;
  hand: 'left' | 'right';
  // Advanced
  regularityIndex: number;    // 0–1
  harmonicRatio: number;      // 0–∞ (typically 0–4)
  intermittency: number;      // 0–1
  phaseOffsetDeg: number;     // 0–360°
  dominantAxis: 'X' | 'Y' | 'Z';
  tremorProfile: 'parkinsons-likely' | 'essential-likely' | 'physiological' | 'minimal';
}
```

All data stored locally via AsyncStorage. No network requests. No analytics. No crash reporting.

---

## Roadmap

### v1 (current)
- [x] Sensor capture (acc + gyro)
- [x] Bandpass filter + FFT
- [x] Regularity index
- [x] Harmonic ratio
- [x] Tremor intermittency
- [x] Cross-axis phase (pill-rolling)
- [x] Dominant axis detection
- [x] Tremor profile classification
- [x] Live waveform display
- [x] Session history + trend chart
- [x] PDF report

### v2
- [ ] Rest vs Action tremor comparison (clinically distinct postures)
- [ ] Medication timing tracker (correlate dose times with scores)
- [ ] Dual-hand asymmetry score (early Parkinson's is asymmetric)
- [ ] UPDRS Part III tremor subscore mapping
- [ ] On-device TFLite classifier (trained on PhysioNet tremor dataset)
- [ ] Supabase cloud sync (opt-in)
- [ ] Caregiver remote dashboard

---

## Clinical Background

Parkinson's disease tremor characteristics that this app detects:

| Feature | Parkinson's | Essential Tremor | Physiological |
|---------|-------------|-----------------|---------------|
| Frequency | 4–6 Hz | 6–12 Hz | 8–12 Hz |
| Type | Resting | Postural/Action | Postural/Action |
| Regularity | Very high | Moderate | Low |
| Harmonics | Strong | Weak | Very weak |
| Pattern | Pill-rolling | Variable | Variable |
| Intermittency | 50–80% | Continuous | Sporadic |

Sources: Deuschl et al. (1998), Elble & Koller (1990), Grimaldi & Manto (2008).

---

## Disclaimer

TremorLog is a personal symptom logging tool. It is **not** a medical device, **not** FDA-cleared, and **not** a substitute for clinical diagnosis. The tremor profile classification is based on published signal features but has not been clinically validated. Always share results with a qualified neurologist.

---

*Built for patients, trusted by doctors.*
