import {
  isDeviceLocationFresh,
  type DeviceLocationRecord,
} from './browseLocationMemory';

export type DiscoveryMode =
  | 'radial'
  | 'administrative'
  | 'administrative-fallback';

export type BrowseOrigin = {
  latitude: number;
  longitude: number;
};

export function parseBrowseOrigin(
  latitude?: number,
  longitude?: number,
): BrowseOrigin | null {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return null;
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90) return null;
  if (longitude < -180 || longitude > 180) return null;
  return {latitude, longitude};
}

export function readFreshDeviceOrigin(
  device?: DeviceLocationRecord,
): BrowseOrigin | null {
  if (!device || !isDeviceLocationFresh(device)) return null;
  return parseBrowseOrigin(device.latitude, device.longitude);
}

/** ~100 m buckets so cache/query identity is origin-safe without exact GPS keys. */
export function originCacheToken(origin: BrowseOrigin | null): string {
  if (!origin) return '';
  return `${origin.latitude.toFixed(3)},${origin.longitude.toFixed(3)}`;
}

export function shouldUseAdministrativeFallback(args: {
  originSent: boolean;
  offset: number;
  total: number;
}): boolean {
  return args.originSent && args.offset === 0 && args.total === 0;
}

type SortableProvider = {
  isOnline?: boolean;
  rating?: number;
  distanceMeters?: number;
};

/** Web BrowsePage: online first, then rating. Radial only if the API used GPS. */
export function sortBrowseRows<T extends SortableProvider>(
  list: T[],
  mode: DiscoveryMode = 'administrative',
): T[] {
  if (mode === 'radial') {
    return [...list].sort((a, b) => {
      const da = a.distanceMeters;
      const db = b.distanceMeters;
      if (typeof da === 'number' && typeof db === 'number' && da !== db) {
        return da - db;
      }
      return (b.rating || 0) - (a.rating || 0);
    });
  }
  return [...list].sort((a, b) => {
    if (Boolean(a.isOnline) !== Boolean(b.isOnline)) {
      return a.isOnline ? -1 : 1;
    }
    return (b.rating || 0) - (a.rating || 0);
  });
}
