/**
 * Provider Location Service
 * Manages provider's online/offline status and real-time location updates
 * Similar to Ola/Uber driver location tracking
 */

import firestore from '@react-native-firebase/firestore';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import GeolocationService from './geolocationService';

export interface ProviderLocation {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  updatedAt: number;
}

export interface ProviderStatus {
  isOnline: boolean;
  isAvailable: boolean; // Available for new requests
  lastSeen: number;
  currentLocation?: ProviderLocation;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371; // Radius of the Earth in kilometers
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

/**
 * Format distance for display
 */
export const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
};

/**
 * Calculate estimated time of arrival (ETA) in minutes
 * Assumes average speed of 30 km/h for local travel
 */
export const calculateETA = (distanceKm: number): number => {
  const averageSpeedKmh = 30; // 30 km/h average speed
  const timeHours = distanceKm / averageSpeedKmh;
  return Math.ceil(timeHours * 60); // Convert to minutes
};

/**
 * Set provider online status
 */
export const setProviderOnline = async (isOnline: boolean): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const providerId = currentUser.uid;

    // Update in Firestore
    await firestore()
      .collection('providers')
      .doc(providerId)
      .update({
        isOnline,
        lastSeen: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    // Update in Realtime Database for real-time status
    await database()
      .ref(`providers/${providerId}/status`)
      .set({
        isOnline,
        isAvailable: isOnline, // When going online, also set as available
        lastSeen: Date.now(),
      });

    console.log(`Provider ${isOnline ? 'online' : 'offline'}`);
  } catch (error: any) {
    console.error('Error setting provider online status:', error);
    throw new Error(`Failed to update online status: ${error.message}`);
  }
};

/**
 * Update provider's current location
 * Should be called periodically when provider is online
 */
export const updateProviderLocation = async (): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Check if provider is online
    const providerDoc = await firestore()
      .collection('providers')
      .doc(currentUser.uid)
      .get();

    if (!providerDoc.exists) {
      throw new Error('Provider profile not found');
    }

    const providerData = providerDoc.data();
    if (!providerData?.isOnline) {
      console.log('Provider is offline, skipping location update');
      return;
    }

    // Get current location
    const location = await GeolocationService.getCurrentLocation();
    if (!location) {
      throw new Error('Failed to get current location');
    }

    const providerLocation: ProviderLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address,
      city: location.city,
      state: location.state,
      pincode: location.pincode,
      updatedAt: Date.now(),
    };

    // Update in Firestore
    await firestore()
      .collection('providers')
      .doc(currentUser.uid)
      .update({
        currentLocation: {
          ...providerLocation,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        lastSeen: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    // Update in Realtime Database for real-time tracking
    await database()
      .ref(`providers/${currentUser.uid}/location`)
      .set(providerLocation);

    console.log('Provider location updated:', providerLocation);
  } catch (error: any) {
    console.error('Error updating provider location:', error);
    throw new Error(`Failed to update location: ${error.message}`);
  }
};

/**
 * Start real-time location tracking
 * Updates location every 30 seconds when provider is online
 */
export const startLocationTracking = (): (() => void) => {
  let intervalId: NodeJS.Timeout | null = null;

  const updateLocation = async () => {
    try {
      await updateProviderLocation();
    } catch (error) {
      console.error('Error in location tracking:', error);
    }
  };

  // Update immediately
  updateLocation();

  // Then update every 30 seconds
  intervalId = setInterval(updateLocation, 30000); // 30 seconds

  // Return stop function
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
};

/**
 * Get provider's current status
 */
export const getProviderStatus = async (providerId: string): Promise<ProviderStatus | null> => {
  try {
    const providerDoc = await firestore()
      .collection('providers')
      .doc(providerId)
      .get();

    if (!providerDoc.exists) {
      return null;
    }

    const data = providerDoc.data();
    return {
      isOnline: data?.isOnline || false,
      isAvailable: data?.isAvailable !== false, // Default to true if not set
      lastSeen: data?.lastSeen?.toMillis() || Date.now(),
      currentLocation: data?.currentLocation
        ? {
            ...data.currentLocation,
            updatedAt: data.currentLocation.updatedAt?.toMillis() || Date.now(),
          }
        : undefined,
    };
  } catch (error) {
    console.error('Error getting provider status:', error);
    return null;
  }
};

/**
 * Calculate distance from provider to customer
 */
export const getDistanceToCustomer = (
  providerLocation: ProviderLocation,
  customerLocation: {latitude: number; longitude: number},
): {distanceKm: number; distanceFormatted: string; etaMinutes: number} => {
  const distanceKm = calculateDistance(
    providerLocation.latitude,
    providerLocation.longitude,
    customerLocation.latitude,
    customerLocation.longitude,
  );

  return {
    distanceKm,
    distanceFormatted: formatDistance(distanceKm),
    etaMinutes: calculateETA(distanceKm),
  };
};

