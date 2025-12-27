import Geolocation from 'react-native-geolocation-service';
import GeolocationCommunity from '@react-native-community/geolocation';
import {Platform, PermissionsAndroid, Alert} from 'react-native';
import {logger} from '../utils/logger';

export interface LocationData {
  latitude: number;
  longitude: number;
  pincode?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

/**
 * Geolocation Service
 * Handles location detection and reverse geocoding for pincode detection
 */
class GeolocationService {
  /**
   * Check location permission status without requesting it
   */
  async checkLocationPermission(): Promise<'granted' | 'denied' | 'never_ask_again' | 'not_determined'> {
    if (Platform.OS === 'android') {
      try {
        // On Android 13+ (API 33+), we need to check permissions properly
        const checkFineLocation = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (checkFineLocation) {
          return 'granted';
        }
        
        // Check coarse location as fallback
        const checkCoarseLocation = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        );
        if (checkCoarseLocation) {
          return 'granted';
        }
        
        return 'denied';
      } catch (err: any) {
        // On error, assume permission is not granted
        if (__DEV__) {
          logger.error('Error checking location permission:', err);
        }
        return 'denied';
      }
    }
    // iOS permissions are handled automatically
    return 'not_determined';
  }

  /**
   * Request location permissions
   * Returns permission status: 'granted', 'denied', or 'never_ask_again'
   */
  async requestLocationPermission(): Promise<'granted' | 'denied' | 'never_ask_again'> {
    if (Platform.OS === 'android') {
      try {
        // First check if already granted
        const checkFineLocation = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (checkFineLocation) {
          return 'granted';
        }

        // On Android 13+ (API 33+), request both fine and coarse location
        // Request fine location first (includes coarse on older Android)
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'HomeServices needs access to your location to provide accurate medicine delivery services.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          return 'granted';
        } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          return 'never_ask_again';
        } else {
          // If fine location denied, try coarse location as fallback (Android 13+)
          try {
            const coarseGranted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
              {
                title: 'Location Permission',
                message: 'HomeServices needs access to your approximate location to provide accurate medicine delivery services.',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'OK',
              },
            );
            if (coarseGranted === PermissionsAndroid.RESULTS.GRANTED) {
              return 'granted';
            } else if (coarseGranted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
              return 'never_ask_again';
            }
          } catch (coarseError) {
            // Fall through to return 'denied'
          }
          return 'denied';
        }
      } catch (err: any) {
        if (__DEV__) {
          logger.error('Error requesting location permission:', err);
        }
        return 'denied';
      }
    }
    // iOS permissions are handled automatically
    return 'granted';
  }

  /**
   * Check if we should skip Google Play Services geolocation (due to emulator or compatibility issues)
   * By default, skip to avoid Google Play Services class conflicts
   */
  private shouldSkipFusedLocation(): boolean {
    if (Platform.OS === 'android') {
      // Skip FusedLocation to avoid class conflict errors
      // Community geolocation is more reliable and doesn't depend on Google Play Services
      return true;
    }
    return false;
  }

  /**
   * Get current location using fallback method
   * Uses @react-native-community/geolocation by default to avoid Google Play Services conflicts
   * Handles Google Play Services errors gracefully (common on emulators and some devices)
   * Wrapped to prevent app crashes from native bridge errors
   */
  async getCurrentLocation(): Promise<LocationData> {
    // Verify permission before attempting to get location
    const hasPermission = await this.checkLocationPermission();
    if (hasPermission !== 'granted') {
      throw new Error('Location permission not granted. Please enable location permission in settings.');
    }

    // Wrap entire method to catch any unexpected errors
    try {
      // Use community geolocation by default to avoid Google Play Services class conflicts
      const useCommunityFirst = this.shouldSkipFusedLocation();
      
      if (useCommunityFirst) {
        // Use community geolocation (more reliable, no Google Play Services dependency)
        return await this.getCurrentLocationWithCommunity();
      }

      // Try react-native-geolocation-service (only if not skipping)
      try {
        return await this.getCurrentLocationWithFusedLocation();
      } catch (fusedError: any) {
        // If fused location fails, fallback to community geolocation
        const errorMessage = fusedError?.message || String(fusedError) || '';
        if (__DEV__) {
          logger.warn('Fused location failed, falling back to community geolocation:', errorMessage);
        }
        return await this.getCurrentLocationWithCommunity();
      }
    } catch (error: any) {
      // Final safety net - catch any unexpected errors
      const errorMessage = error?.message || String(error) || '';
      
      // Don't retry if it's a permission error
      if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
        throw error;
      }
      
      // Always try community geolocation as last resort if any error occurs
      if (!errorMessage.includes('Location services unavailable') && 
          !errorMessage.includes('permission') &&
          !errorMessage.includes('Permission')) {
        try {
          return await this.getCurrentLocationWithCommunity();
        } catch (fallbackError) {
          if (__DEV__) {
            logger.error('All location methods failed:', fallbackError);
          }
          throw new Error('Location services unavailable. Please set your location manually.');
        }
      }
      
      throw error;
    }
  }

  /**
   * Get location using react-native-geolocation-service (Google Play Services)
   * Wrapped with extensive error handling to prevent native bridge crashes
   */
  private async getCurrentLocationWithFusedLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      // Use the community geolocation method as fallback
      const tryCommunityGeolocation = () => {
        this.getCurrentLocationWithCommunity().then(resolve).catch(reject);
      };

      // Wrap the entire call in a try-catch to catch native bridge errors
      try {
        // Additional safety: Check if Geolocation module is available
        if (!Geolocation || typeof Geolocation.getCurrentPosition !== 'function') {
          tryCommunityGeolocation();
          return;
        }

        Geolocation.getCurrentPosition(
          async position => {
            const locationData: LocationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };

            // Reverse geocode to get address and pincode
            try {
              const addressData = await this.reverseGeocode(
                position.coords.latitude,
                position.coords.longitude,
              );
              resolve({...locationData, ...addressData});
            } catch (error) {
              // Return location even if reverse geocoding fails
              resolve(locationData);
            }
          },
          error => {
            
            // Handle specific Google Play Services errors - fallback to community geolocation
            const errorMessage = error?.message || String(error) || '';
            const errorCode = error?.code || '';
            
            if (errorMessage.includes('RNFusedLocation') || 
                errorMessage.includes('FusedLocationProviderClient') ||
                errorMessage.includes('Could not invoke') ||
                (errorMessage.includes('interface') && errorMessage.includes('class was expected')) ||
                errorCode === 'UNAVAILABLE' ||
                errorCode === 'UNAUTHORIZED') {
              tryCommunityGeolocation();
            } else {
              reject(new Error('Failed to get location. Please enable location services.'));
            }
          },
          {
            accuracy: {
              android: 'high',
              ios: 'best',
            },
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 10000,
          },
        );
      } catch (error: any) {
        // Catch initialization errors (class loading conflicts, native bridge errors) - fallback to community geolocation
        const errorMessage = error?.message || String(error) || '';
        const errorString = String(error) || '';
        
        // Check for various Google Play Services error patterns
        const isGooglePlayServicesError = 
          errorMessage.includes('FusedLocationProviderClient') || 
          errorMessage.includes('RNFusedLocation') ||
          errorMessage.includes('Could not invoke') ||
          (errorMessage.includes('interface') && errorMessage.includes('class was expected')) ||
          errorString.includes('FusedLocationProviderClient') ||
          errorString.includes('RNFusedLocation') ||
          errorString.includes('Could not invoke');
        
        if (isGooglePlayServicesError) {
        } else {
        }
        
        // Always try fallback for any error
        tryCommunityGeolocation();
      }
    });
  }

  /**
   * Get location using @react-native-community/geolocation (fallback method)
   * This works without Google Play Services
   */
  private async getCurrentLocationWithCommunity(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      // Verify GeolocationCommunity is available before using
      if (!GeolocationCommunity || typeof GeolocationCommunity.getCurrentPosition !== 'function') {
        reject(new Error('Location services unavailable. Please set your location manually.'));
        return;
      }

      try {
        // First verify permission before attempting to get location
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
          .then(async (hasFineLocation) => {
            const hasCoarseLocation = await PermissionsAndroid.check(
              PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
            );

            if (!hasFineLocation && !hasCoarseLocation) {
              reject(new Error('Location permission not granted. Please enable location permission in settings.'));
              return;
            }

            try {
              GeolocationCommunity.getCurrentPosition(
                async position => {
                  try {
                    const locationData: LocationData = {
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude,
                    };

                    // Reverse geocode to get address and pincode
                    try {
                      const addressData = await this.reverseGeocode(
                        position.coords.latitude,
                        position.coords.longitude,
                      );
                      resolve({...locationData, ...addressData});
                    } catch (error) {
                      // Return location even if reverse geocoding fails
                      resolve(locationData);
                    }
                  } catch (err: any) {
                    reject(new Error('Failed to process location data. Please try again.'));
                  }
                },
                error => {
                  const errorMessage = error?.message || String(error) || 'Unknown error';
                  if (__DEV__) {
                    logger.error('Geolocation error:', error);
                  }
                  
                  // Provide user-friendly error messages
                  if (errorMessage.includes('permission') || errorMessage.includes('PERMISSION')) {
                    reject(new Error('Location permission denied. Please enable location permission in settings.'));
                  } else if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
                    reject(new Error('Location request timed out. Please try again or set location manually.'));
                  } else if (errorMessage.includes('unavailable') || errorMessage.includes('UNAVAILABLE')) {
                    reject(new Error('Location services unavailable. Please enable location services or set location manually.'));
                  } else {
                    reject(new Error('Failed to get location. Please enable location services or set location manually.'));
                  }
                },
                {
                  enableHighAccuracy: true,
                  timeout: 15000, // Increased timeout for better reliability
                  maximumAge: 10000,
                },
              );
            } catch (err: any) {
              if (__DEV__) {
                logger.error('Error calling getCurrentPosition:', err);
              }
              reject(new Error('Location services unavailable. Please set your location manually.'));
            }
          })
          .catch((permissionError) => {
            if (__DEV__) {
              logger.error('Error checking permission:', permissionError);
            }
            reject(new Error('Location permission check failed. Please enable location permission in settings.'));
          });
      } catch (error: any) {
        if (__DEV__) {
          logger.error('Error in getCurrentLocationWithCommunity:', error);
        }
        reject(new Error('Location services unavailable. Please set your location manually.'));
      }
    });
  }

  /**
   * Reverse geocode coordinates to get address and pincode
   * Uses OpenStreetMap Nominatim API (free, no API key required)
   */
  async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<{
    pincode?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  }> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'HomeServices-App/1.0',
        },
      });

      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }

      const data = await response.json();
      const address = data.address || {};

      // Extract pincode (postcode in OSM)
      const pincode = address.postcode || address.pin_code || undefined;
      const city = address.city || address.town || address.village || address.county || undefined;
      const state = address.state || undefined;
      const country = address.country || undefined;
      
      // Build full address string
      const addressParts = [];
      if (address.house_number || address.house_name) {
        addressParts.push(address.house_number || address.house_name);
      }
      if (address.road) {
        addressParts.push(address.road);
      }
      if (address.neighbourhood || address.suburb) {
        addressParts.push(address.neighbourhood || address.suburb);
      }
      if (city) {
        addressParts.push(city);
      }
      if (state) {
        addressParts.push(state);
      }
      if (pincode) {
        addressParts.push(pincode);
      }
      if (country) {
        addressParts.push(country);
      }

      const fullAddress = addressParts.join(', ');

      return {
        pincode,
        address: fullAddress || data.display_name || undefined,
        city,
        state,
        country,
      };
    } catch (error) {
      // Fallback: Try Google Geocoding API if you have API key
      // For now, return empty object
      return {};
    }
  }

  /**
   * Forward geocode pincode to get address
   * Uses OpenStreetMap Nominatim API (free, no API key required)
   */
  async geocodePincode(pincode: string): Promise<{
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  }> {
    try {
      // For India, search with country code
      const url = `https://nominatim.openstreetmap.org/search?format=json&postalcode=${encodeURIComponent(pincode)}&country=India&addressdetails=1&limit=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'HomeServices-App/1.0',
        },
      });

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();
      
      if (!data || data.length === 0) {
        return {};
      }

      const result = data[0];
      const address = result.address || {};
      
      const city = address.city || address.town || address.village || address.county || undefined;
      const state = address.state || undefined;
      const country = address.country || undefined;
      
      // Build full address string
      const addressParts = [];
      if (address.road) {
        addressParts.push(address.road);
      }
      if (address.neighbourhood || address.suburb) {
        addressParts.push(address.neighbourhood || address.suburb);
      }
      if (city) {
        addressParts.push(city);
      }
      if (state) {
        addressParts.push(state);
      }
      addressParts.push(pincode);
      if (country) {
        addressParts.push(country);
      }

      const fullAddress = addressParts.join(', ');

      return {
        address: fullAddress || result.display_name || undefined,
        city,
        state,
        country,
        latitude: result.lat ? parseFloat(result.lat) : undefined,
        longitude: result.lon ? parseFloat(result.lon) : undefined,
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * Check if location services are enabled
   */
  async checkLocationEnabled(): Promise<boolean> {
    try {
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        return false;
      }

      // Try to get location to verify it's enabled
      await this.getCurrentLocation();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get location with user-friendly error handling
   */
  async getLocationWithPrompt(): Promise<LocationData | null> {
    try {
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        Alert.alert(
          'Location Permission Required',
          'Please enable location permission in settings to use this feature.',
        );
        return null;
      }

      const location = await this.getCurrentLocation();
      return location;
    } catch (error: any) {
      Alert.alert(
        'Location Error',
        error.message || 'Failed to get your location. Please try again.',
      );
      return null;
    }
  }
}

export default new GeolocationService();

