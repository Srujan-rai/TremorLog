import { TremorProfile } from '../services/signal';

export interface TremorSession {
  id: string;
  timestamp: number;
  durationMs: number;
  score: number;
  dominantFreqHz: number;
  amplitudeRMS: number;
  gyroRMS: number;
  deviceModel: string;
  noiseFloor: number;
  hand: 'left' | 'right';
  notes?: string;
  // Advanced analysis
  regularityIndex: number;
  harmonicRatio: number;
  intermittency: number;
  phaseOffsetDeg: number;
  dominantAxis: 'X' | 'Y' | 'Z';
  tremorProfile: TremorProfile;
  spectralEntropy: number;
  bandPowerRatio: number;
  frequencyJitterHz: number;
  peakQFactor: number;
}

export interface CalibrationBaseline {
  deviceModel: string;
  noiseFloor: number;
  capturedAt: number;
}
