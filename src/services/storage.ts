import { createMMKV } from 'react-native-mmkv';
import { TremorSession, CalibrationBaseline } from '../types/session';
import uuid from 'react-native-uuid';

const storage = createMMKV();

export function saveSession(session: Omit<TremorSession, 'id'>): TremorSession {
  const id = uuid.v4() as string;
  const full: TremorSession = { ...session, id };

  storage.set(`sessions:${id}`, JSON.stringify(full));

  const listRaw = storage.getString('sessions:list');
  const list: string[] = listRaw ? JSON.parse(listRaw) : [];
  list.unshift(id);
  storage.set('sessions:list', JSON.stringify(list));

  return full;
}

export function getSession(id: string): TremorSession | null {
  try {
    const raw = storage.getString(`sessions:${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getAllSessions(): TremorSession[] {
  try {
    const listRaw = storage.getString('sessions:list');
    if (!listRaw) return [];
    const ids: string[] = JSON.parse(listRaw);
    return ids.map((id) => getSession(id)).filter(Boolean) as TremorSession[];
  } catch {
    return [];
  }
}

export function deleteSession(id: string): void {
  storage.remove(`sessions:${id}`);
  const listRaw = storage.getString('sessions:list');
  const list: string[] = listRaw ? JSON.parse(listRaw) : [];
  storage.set('sessions:list', JSON.stringify(list.filter((i) => i !== id)));
}

export function saveCalibration(baseline: CalibrationBaseline): void {
  storage.set('calibration:baseline', JSON.stringify(baseline));
}

export function getCalibration(): CalibrationBaseline | null {
  try {
    const raw = storage.getString('calibration:baseline');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isOnboardingComplete(): boolean {
  return storage.getString('onboarding:complete') === 'true';
}

export function setOnboardingComplete(): void {
  storage.set('onboarding:complete', 'true');
}
