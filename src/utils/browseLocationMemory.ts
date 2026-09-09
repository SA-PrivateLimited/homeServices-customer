/**
 * Browse location memory — AsyncStorage port of customer-web browseLocationMemory.
 * searchLocation drives discovery; deviceLocation is last-known GPS.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const BROWSE_LOCATION_STORAGE_KEY = 'akanso_location_v1';
export const LOCATION_MAX_AGE_MS = 30 * 60 * 1000;

export type LocationSource = 'device' | 'manual';
export type LocationPermission = 'granted' | 'denied' | 'prompt' | 'unknown';

export type StoredPlace = {
  stateId: string;
  districtId: string;
  blockId?: string;
  stateName?: string;
  districtName?: string;
  blockName?: string;
  label: string;
};

export type DeviceLocationRecord = StoredPlace & {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  capturedAt: string;
};

export type SearchLocationRecord = StoredPlace & {
  source: LocationSource;
  updatedAt: string;
};

export type AkanshoLocationMemory = {
  version: 1;
  permission?: LocationPermission;
  device?: DeviceLocationRecord;
  search?: SearchLocationRecord;
};

export async function readLocationMemory(): Promise<AkanshoLocationMemory | null> {
  try {
    const raw = await AsyncStorage.getItem(BROWSE_LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AkanshoLocationMemory;
    if (!parsed || parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeLocationMemory(
  next: AkanshoLocationMemory | null,
): Promise<void> {
  try {
    if (!next) {
      await AsyncStorage.removeItem(BROWSE_LOCATION_STORAGE_KEY);
      return;
    }
    await AsyncStorage.setItem(BROWSE_LOCATION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export async function patchLocationMemory(
  patch: Partial<AkanshoLocationMemory>,
): Promise<AkanshoLocationMemory> {
  const current = (await readLocationMemory()) || {version: 1 as const};
  const merged: AkanshoLocationMemory = {
    ...current,
    ...patch,
    version: 1,
  };
  await writeLocationMemory(merged);
  return merged;
}

export function isDeviceLocationFresh(
  device: DeviceLocationRecord | undefined,
  maxAgeMs: number = LOCATION_MAX_AGE_MS,
): boolean {
  if (!device?.capturedAt) return false;
  const captured = Date.parse(device.capturedAt);
  if (!Number.isFinite(captured)) return false;
  return Date.now() - captured <= maxAgeMs;
}

export async function readSearchLocation(): Promise<SearchLocationRecord | null> {
  const memory = await readLocationMemory();
  const search = memory?.search;
  if (!search?.stateId && !search?.districtId && !search?.label) return null;
  if (!search.stateId && !search.districtId && !search.blockId) return null;
  return search;
}

export async function saveManualSearchLocation(place: StoredPlace): Promise<void> {
  const updatedAt = new Date().toISOString();
  await patchLocationMemory({
    search: {
      ...place,
      source: 'manual',
      updatedAt,
    },
  });
}

export async function saveDeviceAsSearchLocation(
  place: StoredPlace & {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  },
  permission: LocationPermission = 'granted',
): Promise<void> {
  const now = new Date().toISOString();
  await patchLocationMemory({
    permission,
    device: {
      stateId: place.stateId,
      districtId: place.districtId,
      blockId: place.blockId,
      stateName: place.stateName,
      districtName: place.districtName,
      blockName: place.blockName,
      label: place.label,
      latitude: place.latitude,
      longitude: place.longitude,
      accuracy: place.accuracy,
      capturedAt: now,
    },
    search: {
      stateId: place.stateId,
      districtId: place.districtId,
      blockId: place.blockId,
      stateName: place.stateName,
      districtName: place.districtName,
      blockName: place.blockName,
      label: place.label,
      source: 'device',
      updatedAt: now,
    },
  });
}

export async function clearSearchLocation(): Promise<void> {
  const current = await readLocationMemory();
  if (!current) return;
  const {search: _removed, ...rest} = current;
  await writeLocationMemory({...rest, version: 1});
}
