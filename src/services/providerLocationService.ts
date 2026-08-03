/**
 * Distance / ETA helpers for customer app (Mongo-backed locations).
 */

export interface ProviderLocation {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  updatedAt?: number;
}

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
};

export const calculateETA = (distanceKm: number): number => {
  const averageSpeedKmh = 30;
  const timeHours = distanceKm / averageSpeedKmh;
  return Math.ceil(timeHours * 60);
};

export const getDistanceToCustomer = (
  providerLoc: {latitude: number; longitude: number},
  customerLoc: {latitude: number; longitude: number},
): {distanceKm: number; distanceFormatted: string; etaMinutes: number} => {
  const distanceKm = calculateDistance(
    providerLoc.latitude,
    providerLoc.longitude,
    customerLoc.latitude,
    customerLoc.longitude,
  );
  return {
    distanceKm,
    distanceFormatted: formatDistance(distanceKm),
    etaMinutes: calculateETA(distanceKm),
  };
};
