import { colors } from './tokens';

export function scoreColor(score: number): string {
  if (score >= 80) return colors.success;
  if (score >= 60) return colors.warning;
  if (score >= 40) return colors.orange;
  return colors.danger;
}

export function movementColor(amp: number): string {
  if (amp > 0.6) return colors.danger;
  if (amp > 0.3) return colors.warning;
  return colors.success;
}

export function movementLabel(amp: number): string {
  if (amp > 0.6) return 'High movement';
  if (amp > 0.3) return 'Some movement';
  return 'Very stable';
}

export function deltaColor(delta: number): string {
  return delta >= 0 ? colors.success : colors.danger;
}

export function scoreBackground(score: number): string {
  const c = scoreColor(score);
  return c + '26'; // ~15% opacity hex suffix
}
