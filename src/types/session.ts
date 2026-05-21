export interface TremorSession {
  id: string;
  timestamp: number;
  durationMs: number;
  score: number;
  dominantFreqHz: number;
  amplitudeRMS: number;
  deviceModel: string;
  noiseFloor: number;
  hand: 'left' | 'right';
  notes?: string;
}

export interface CalibrationBaseline {
  deviceModel: string;
  noiseFloor: number;
  capturedAt: number;
}
