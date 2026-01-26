import GeolocationService from '../services/geolocationService';
import {updateUserLocation} from '../services/authService';
import {Alert} from 'react-native';
import type {UserLocation} from '../types/common';

/**
 * Helper function to get and save user location
 * This can be called from Settings screen or Profile screen
 */
export const getAndSaveUserLocation = async (
  userId: string,
  showAlert: boolean = true,
): Promise<UserLocation | null> => {
  try {
    // Request location permission
    const hasPermission = await GeolocationService.requestLocationPermission();
    if (hasPermission !== 'granted') {
      if (showAlert) {
        const message = hasPermission === 'never_ask_again'
          ? 'Location permission was permanently denied. Please enable it in device settings to use this feature.'
          : 'Location permission is required. Please enable it in settings to use this feature.';
        Alert.alert('Location Permission Required', message);
      }
      return null;
    }

    // Get current location with timeout
    const locationPromise = GeolocationService.getCurrentLocation();
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Location detection timeout')), 15000)
    );

    const location = await Promise.race([locationPromise, timeoutPromise]);
    
    if (!location) {
      if (showAlert) {
        Alert.alert('Error', 'Failed to get your location. Please try again.');
      }
      return null;
    }

    // Save location to user profile
    const locationData: UserLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
      pincode: location.pincode,
      address: location.address,
      city: location.city,
      state: location.state,
      country: location.country,
    };

    try {
      await updateUserLocation(userId, locationData);
      
      if (showAlert && location.pincode) {
        Alert.alert(
          'Location Updated',
          `Your location has been updated. Pincode: ${location.pincode}`,
        );
      }
    } catch (saveError: any) {
      // Location was detected but save failed - still return the location data
      if (showAlert) {
        Alert.alert(
          'Warning',
          'Location detected but could not be saved. Please try again later.',
        );
      }
    }

    return locationData;
  } catch (error: any) {
    const errorMessage = error?.message || String(error) || 'Unknown error';
    let userMessage = 'Failed to update location. Please try again.';
    
    if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
      userMessage = 'Location permission is required. Please enable it in settings.';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
      userMessage = 'Location detection timed out. Please try again.';
    } else if (errorMessage.includes('unavailable') || errorMessage.includes('UNAVAILABLE')) {
      userMessage = 'Location services are unavailable. Please enable location services.';
    }
    
    if (showAlert) {
      Alert.alert('Error', userMessage);
    }
    return null;
  }
};

/**
 * Format location for display
 */
export const formatLocation = (location: UserLocation | undefined): string => {
  if (!location) {
    return 'Location not set';
  }

  const parts = [];
  if (location.address) {
    parts.push(location.address);
  } else {
    if (location.city) parts.push(location.city);
    if (location.state) parts.push(location.state);
    if (location.pincode) parts.push(location.pincode);
    if (location.country) parts.push(location.country);
  }

  return parts.length > 0 ? parts.join(', ') : 'Location not set';
};

