import AsyncStorage from '@react-native-async-storage/async-storage';
import {apiGet} from './apiClient';

export interface GeographyState {
  _id: string;
  name: string;
  code?: string;
}

export interface GeographyDistrict {
  _id: string;
  name: string;
  stateId: string;
  stateName: string;
  pincode?: string;
}

export interface GeographyMeta {
  states: GeographyState[];
  districts: GeographyDistrict[];
}

const STORAGE_KEY = 'hs_geography_meta_v1';
const TTL_MS = 24 * 60 * 60 * 1000;

type CachedMeta = GeographyMeta & {cachedAt: number; version: number};

let memoryCache: CachedMeta | null = null;
let inflight: Promise<GeographyMeta> | null = null;

function normalize(data: GeographyMeta | null | undefined): GeographyMeta {
  return {
    states: data?.states || [],
    districts: data?.districts || [],
  };
}

function isFresh(cachedAt: number): boolean {
  return Date.now() - cachedAt < TTL_MS;
}

function metaEquals(a: GeographyMeta, b: GeographyMeta): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function readStorage(): Promise<CachedMeta | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedMeta;
    if (!parsed?.states || !parsed?.districts) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeStorage(meta: GeographyMeta): Promise<CachedMeta> {
  const payload: CachedMeta = {
    ...normalize(meta),
    cachedAt: Date.now(),
    version: 1,
  };
  memoryCache = payload;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore persistence failures
  }
  return payload;
}

async function fetchFromNetwork(): Promise<GeographyMeta> {
  const data = await apiGet<GeographyMeta>('/geography/meta', {skipAuth: true});
  return normalize(data);
}

/**
 * Cached geography masters. Returns memory/AsyncStorage immediately when warm;
 * soft-refreshes from network in the background.
 */
export async function getGeographyMeta(options?: {
  force?: boolean;
}): Promise<GeographyMeta> {
  const force = options?.force === true;

  if (!force && memoryCache) {
    const snapshot = normalize(memoryCache);
    void softRefresh(snapshot);
    return snapshot;
  }

  if (!force) {
    const stored = await readStorage();
    if (stored) {
      memoryCache = stored;
      const snapshot = normalize(stored);
      void softRefresh(snapshot);
      return snapshot;
    }
  }

  if (inflight && !force) {
    return inflight;
  }

  inflight = (async () => {
    try {
      const meta = await fetchFromNetwork();
      await writeStorage(meta);
      return meta;
    } catch {
      if (memoryCache) return normalize(memoryCache);
      const stored = await readStorage();
      if (stored) {
        memoryCache = stored;
        return normalize(stored);
      }
      return {states: [], districts: []};
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** Soft network refresh; updates cache when data differs or TTL expired. */
async function softRefresh(previous: GeographyMeta): Promise<void> {
  try {
    const next = await fetchFromNetwork();
    if (!metaEquals(previous, next) || !memoryCache || !isFresh(memoryCache.cachedAt)) {
      await writeStorage(next);
    }
  } catch {
    // keep serving cached data
  }
}

/** Whether a warm cache is already available (memory). */
export function hasWarmGeographyMeta(): boolean {
  return Boolean(memoryCache?.states?.length || memoryCache?.districts?.length);
}

/** Peek memory cache synchronously (may be empty on cold start). */
export function peekGeographyMeta(): GeographyMeta | null {
  return memoryCache ? normalize(memoryCache) : null;
}
