/**
 * Browse location memory — AsyncStorage port of customer-web browseLocationMemory.
 *
 * Two concepts (must stay separate):
 * - `search`  = ACTIVE location for provider discovery (manual or device)
 * - `device`  = GPS cache (coordinates + last resolved place); TTL applies here only
 *
 * Manual active location never expires via GPS TTL and must not be overwritten
 * by a background GPS refresh.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const BROWSE_LOCATION_STORAGE_KEY = 'akanso_location_v1';
/** GPS-derived cache freshness (manual active location is not expired by this). */
export const CURRENT_LOCATION_CACHE_TTL_MS = 30 * 60 * 1000;
/** @deprecated Prefer CURRENT_LOCATION_CACHE_TTL_MS */
export const LOCATION_MAX_AGE_MS = CURRENT_LOCATION_CACHE_TTL_MS;

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

export function hasStoredPlace(place?: StoredPlace | null): boolean {
  if (!place) return false;
  return Boolean(
    place.stateId || place.districtId || place.blockId || place.label?.trim(),
  );
}

export function isDeviceLocationFresh(
  device: DeviceLocationRecord | undefined,
  maxAgeMs: number = CURRENT_LOCATION_CACHE_TTL_MS,
): boolean {
  if (!device?.capturedAt) return false;
  const captured = Date.parse(device.capturedAt);
  if (!Number.isFinite(captured)) return false;
  return Date.now() - captured <= maxAgeMs;
}

export async function readSearchLocation(): Promise<SearchLocationRecord | null> {
  const memory = await readLocationMemory();
  const search = memory?.search;
  if (!hasStoredPlace(search)) return null;
  return search ?? null;
}

export async function readFreshDeviceLocation(): Promise<DeviceLocationRecord | null> {
  const memory = await readLocationMemory();
  const device = memory?.device;
  if (!device || !isDeviceLocationFresh(device) || !hasStoredPlace(device)) {
    return null;
  }
  return device;
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

/**
 * Update GPS cache only — never overwrites a manual active search location.
 * If search is missing or already device-sourced, optionally keep search in sync
 * via `promoteToActive`.
 */
export async function saveDeviceLocationCache(
  place: StoredPlace & {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  },
  options?: {
    permission?: LocationPermission;
    /** When true, also set search=device if search is not manual. Default true. */
    promoteToActive?: boolean;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const permission = options?.permission ?? 'granted';
  const promoteToActive = options?.promoteToActive !== false;
  const current = (await readLocationMemory()) || {version: 1 as const};
  const device: DeviceLocationRecord = {
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
  };

  const searchIsManual = current.search?.source === 'manual';
  let nextSearch = current.search;
  if (promoteToActive && !searchIsManual) {
    nextSearch = {
      stateId: place.stateId,
      districtId: place.districtId,
      blockId: place.blockId,
      stateName: place.stateName,
      districtName: place.districtName,
      blockName: place.blockName,
      label: place.label,
      source: 'device',
      updatedAt: now,
    };
  }

  await writeLocationMemory({
    ...current,
    version: 1,
    permission,
    device,
    search: nextSearch,
  });
}

/**
 * Explicit "Using current location" — sets ACTIVE location to GPS-derived place.
 */
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
