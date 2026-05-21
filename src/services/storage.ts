import AsyncStorage from '@react-native-async-storage/async-storage';
import { TremorSession, CalibrationBaseline } from '../types/session';
import uuid from 'react-native-uuid';

export async function saveSession(session: Omit<TremorSession, 'id'>): Promise<TremorSession> {
  const id = uuid.v4() as string;
  const full: TremorSession = { ...session, id };

  await AsyncStorage.setItem(`sessions:${id}`, JSON.stringify(full));

  const listRaw = await AsyncStorage.getItem('sessions:list');
  const list: string[] = listRaw ? JSON.parse(listRaw) : [];
  list.unshift(id);
  await AsyncStorage.setItem('sessions:list', JSON.stringify(list));

  return full;
}

export async function getSession(id: string): Promise<TremorSession | null> {
  try {
    const raw = await AsyncStorage.getItem(`sessions:${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function getAllSessions(): Promise<TremorSession[]> {
  try {
    const listRaw = await AsyncStorage.getItem('sessions:list');
    if (!listRaw) return [];
    const ids: string[] = JSON.parse(listRaw);
    const sessions = await Promise.all(ids.map((id) => getSession(id)));
    return sessions.filter(Boolean) as TremorSession[];
  } catch {
    return [];
  }
}

export async function deleteSession(id: string): Promise<void> {
  await AsyncStorage.removeItem(`sessions:${id}`);
  const listRaw = await AsyncStorage.getItem('sessions:list');
  const list: string[] = listRaw ? JSON.parse(listRaw) : [];
  await AsyncStorage.setItem('sessions:list', JSON.stringify(list.filter((i) => i !== id)));
}

export async function saveCalibration(baseline: CalibrationBaseline): Promise<void> {
  await AsyncStorage.setItem('calibration:baseline', JSON.stringify(baseline));
}

export async function getCalibration(): Promise<CalibrationBaseline | null> {
  try {
    const raw = await AsyncStorage.getItem('calibration:baseline');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function isOnboardingComplete(): Promise<boolean> {
  const val = await AsyncStorage.getItem('onboarding:complete');
  return val === 'true';
}

export async function setOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem('onboarding:complete', 'true');
}
